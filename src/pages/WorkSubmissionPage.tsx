import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileText, Link, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useContractData } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';
import { ipfsService } from '../services/ipfsService';

interface DeliverableFile {
  id: string;
  name: string;
  type: 'file' | 'url';
  content: string;
  size?: number;
  ipfsHash?: string;
  ipfsUrl?: string;
  uploading?: boolean;
}

export const WorkSubmissionPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { getContract, submitWork, getJobDirect } = useContractData();
  
  const [contract, setContract] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<DeliverableFile[]>([]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      console.log('🔍 WorkSubmissionPage: Loading contract data for ID:', contractId);
      if (contractId) {
        const contractData = getContract(contractId);
        console.log('📄 Contract data found:', contractData);
        if (contractData) {
          setContract(contractData);
          console.log('🔍 Looking for job with ID:', contractData.job_id, 'type:', typeof contractData.job_id);
          
          // Use getJobDirect to fetch job from smart contract
          try {
            const jobData = await getJobDirect(contractData.job_id);
            console.log('💼 Job data found via getJobDirect:', jobData);
            setJob(jobData);
          } catch (error) {
            console.error('❌ Error fetching job:', error);
          }
        } else {
          console.log('❌ No contract found for ID:', contractId);
        }
      }
    };
    
    loadData();
  }, [contractId, getContract, getJobDirect]);

  const addDeliverable = (type: 'file' | 'url') => {
    const newDeliverable: DeliverableFile = {
      id: Date.now().toString(),
      name: type === 'file' ? 'New File' : 'New URL',
      type,
      content: '',
      size: type === 'file' ? 0 : undefined
    };
    setDeliverables([...deliverables, newDeliverable]);
  };

  const updateDeliverable = (id: string, field: keyof DeliverableFile, value: any) => {
    setDeliverables(deliverables.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const removeDeliverable = (id: string) => {
    setDeliverables(deliverables.filter(d => d.id !== id));
  };

  const handleFileUpload = async (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected for upload:', file.name, file.size);

    // Set uploading state
    updateDeliverable(id, 'uploading', true);
    updateDeliverable(id, 'name', file.name);
    updateDeliverable(id, 'size', file.size);

    try {
      console.log('🚀 Starting IPFS upload...');
      const ipfsResult = await ipfsService.uploadFile(file);
      
      console.log('✅ IPFS upload successful:', ipfsResult);

      // Update deliverable with IPFS data using atomic update
      setDeliverables(prevDeliverables => 
        prevDeliverables.map(d => 
          d.id === id ? {
            ...d,
            content: ipfsResult.url,
            ipfsHash: ipfsResult.hash,
            ipfsUrl: ipfsResult.url,
            uploading: false
          } : d
        )
      );

    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      
      // Set error state
      setDeliverables(prevDeliverables => 
        prevDeliverables.map(d => 
          d.id === id ? {
            ...d,
            uploading: false,
            content: `Upload failed: ${error}`
          } : d
        )
      );
      
      setErrorMessage(`Failed to upload ${file.name}: ${error}`);
    }
  };

  const validateSubmission = (): boolean => {
    console.log('🔍 Validating submission...');
    console.log('📋 Deliverables:', deliverables);
    console.log('📝 Description:', description);

    if (deliverables.length === 0) {
      console.log('❌ Validation failed: No deliverables');
      setErrorMessage('Please add at least one deliverable');
      return false;
    }

    for (const deliverable of deliverables) {
      console.log(`📄 Checking deliverable: ${deliverable.name}, content: "${deliverable.content}", uploading: ${deliverable.uploading}`);
      
      // Check if file is still uploading
      if (deliverable.uploading) {
        console.log(`❌ Validation failed: ${deliverable.name} is still uploading`);
        setErrorMessage(`Please wait for ${deliverable.name} to finish uploading`);
        return false;
      }

      // Check for content (IPFS URL, regular URL, or text)
      const hasContent = deliverable.content && deliverable.content.trim() && 
                        !deliverable.content.startsWith('Upload failed:');
      
      if (!hasContent) {
        console.log(`❌ Validation failed: Empty or failed content for ${deliverable.name}`);
        setErrorMessage(`Please provide valid content for ${deliverable.name}`);
        return false;
      }

      // For file type, ensure we have either IPFS data or valid content
      if (deliverable.type === 'file' && !deliverable.ipfsHash && !deliverable.content.startsWith('data:')) {
        console.log(`❌ Validation failed: File ${deliverable.name} not properly uploaded`);
        setErrorMessage(`Please upload the file ${deliverable.name} properly`);
        return false;
      }
    }

    if (!description.trim()) {
      console.log('❌ Validation failed: Empty description');
      setErrorMessage('Please provide a work description');
      return false;
    }

    console.log('✅ Validation passed!');
    return true;
  };

  const handleSubmit = async () => {
    console.log('🚀 Submit button clicked!');
    console.log('📋 Current state:', {
      deliverables: deliverables.length,
      description: description.length,
      notes: notes.length,
      contract: !!contract,
      job: !!job,
      submitWork: !!submitWork
    });

    // Check validation first
    const isValid = validateSubmission();
    console.log('✅ Validation result:', isValid);
    if (!isValid) {
      console.log('❌ Validation failed, stopping submission');
      return;
    }

    console.log('🔄 Starting submission process...');
    setIsSubmitting(true);
    setSubmissionStatus('submitting');
    setErrorMessage('');

    try {
      // Check if submitWork function is available
      if (!submitWork) {
        throw new Error('submitWork function is not available');
      }

      // Prepare submission data
      const submissionData = {
        work_id: `work_${contractId}_${Date.now()}`,
        contract_id: parseInt(contractId!),
        deliverables: deliverables.map(d => ({
          name: d.name,
          type: d.type,
          content: d.content,
          url: d.ipfsUrl || d.content,
          ipfs_hash: d.ipfsHash,
          ipfs_url: d.ipfsUrl,
          size: d.size,
          file_info: {
            ipfs_uploaded: !!(d.ipfsHash || d.ipfsUrl)
          }
        })),
        description,
        freelancer_notes: notes,
        category: job?.category || 'general',
        client_id: contract?.client_wallet || '',
        freelancer_address: walletAddress || '',
        submission_timestamp: new Date().toISOString()
      };

      console.log('📤 Submitting data:', submissionData);

      // Submit work for ASI agent verification
      const result = await submitWork(submissionData);
      console.log('✅ Submission successful:', result);

      setSubmissionStatus('success');
      
      // Navigate to work submission status page to track ASI agent verification
      setTimeout(() => {
        navigate(`/contract/${contractId}/submission-status`);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Work submission failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setErrorMessage(error.message || 'Failed to submit work');
      setSubmissionStatus('error');
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Submission process completed');
    }
  };

  if (!contract || !job) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading contract details...</div>
      </div>
    );
  }

  // Check if user is the freelancer
  if (contract.freelancer_wallet.toLowerCase() !== walletAddress?.toLowerCase()) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>Only the assigned freelancer can submit work for this contract.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Submit Work</h1>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Contract:</span>
              <span className="text-white ml-2">#{contract.id}</span>
            </div>
            <div>
              <span className="text-gray-400">Job:</span>
              <span className="text-white ml-2">{job.title}</span>
            </div>
            <div>
              <span className="text-gray-400">Client:</span>
              <span className="text-white ml-2">{contract.client_wallet.slice(0, 8)}...</span>
            </div>
            <div>
              <span className="text-gray-400">Total Amount:</span>
              <span className="text-white ml-2">${job?.budget.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-white font-medium">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Submission Status */}
        {submissionStatus !== 'idle' && (
          <div className={`rounded-lg p-4 mb-6 ${
            submissionStatus === 'success' ? 'bg-green-900 border border-green-700' :
            submissionStatus === 'error' ? 'bg-red-900 border border-red-700' :
            'bg-blue-900 border border-blue-700'
          }`}>
            <div className="flex items-center">
              {submissionStatus === 'submitting' && <Clock className="w-5 h-5 text-blue-400 mr-2 animate-spin" />}
              {submissionStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-400 mr-2" />}
              {submissionStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-400 mr-2" />}
              
              <span className="text-white font-medium">
                {submissionStatus === 'submitting' && 'Submitting work for ASI agent verification...'}
                {submissionStatus === 'success' && 'Work submitted successfully! ASI agents are now reviewing your submission.'}
                {submissionStatus === 'error' && `Submission failed: ${errorMessage}`}
              </span>
            </div>
            
            {submissionStatus === 'success' && (
              <div className="mt-2 text-sm text-gray-300">
                <p>• 3 specialist AI agents will review your work</p>
                <p>• If approved, 20% payment will be released automatically</p>
                <p>• Client will then review and approve for full payment</p>
              </div>
            )}
          </div>
        )}

        {/* Work Description */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Work Description</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the work you've completed, key features implemented, and how it meets the requirements..."
            className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Deliverables */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Deliverables</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => addDeliverable('file')}
                disabled={isSubmitting}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Add File
              </button>
              <button
                onClick={() => addDeliverable('url')}
                disabled={isSubmitting}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Link className="w-4 h-4 mr-2" />
                Add URL
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {deliverables.map((deliverable) => (
              <div key={deliverable.id} className="border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {deliverable.type === 'file' ? (
                      <FileText className="w-5 h-5 text-blue-400 mr-2" />
                    ) : (
                      <Link className="w-5 h-5 text-green-400 mr-2" />
                    )}
                    <input
                      type="text"
                      value={deliverable.name}
                      onChange={(e) => updateDeliverable(deliverable.id, 'name', e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <button
                    onClick={() => removeDeliverable(deliverable.id)}
                    disabled={isSubmitting}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>

                {deliverable.type === 'file' ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(deliverable.id, e)}
                      className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      disabled={isSubmitting || deliverable.uploading}
                    />
                    
                    {/* Upload Status */}
                    {deliverable.uploading && (
                      <div className="flex items-center text-blue-400 text-sm">
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Uploading to IPFS...
                      </div>
                    )}
                    
                    {deliverable.ipfsHash && (
                      <div className="text-green-400 text-sm">
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Uploaded to IPFS: {deliverable.ipfsHash.substring(0, 20)}...
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          <a 
                            href={deliverable.ipfsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-400"
                          >
                            View on IPFS →
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {deliverable.content && deliverable.content.startsWith('Upload failed:') && (
                      <div className="text-red-400 text-sm">
                        <div className="flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          {deliverable.content}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={deliverable.content}
                    onChange={(e) => updateDeliverable(deliverable.id, 'content', e.target.value)}
                    placeholder="https://example.com/your-work"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                )}
              </div>
            ))}

            {deliverables.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No deliverables added yet.</p>
                <p className="text-sm">Add files or URLs to showcase your completed work.</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Additional Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes, instructions, or comments for the client..."
            className="w-full h-24 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* ASI Agent Verification Info */}
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-3">🤖 ASI Agent Verification Process</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-200">
            <div>
              <div className="font-medium mb-1">1. Multi-Agent Review</div>
              <div>3 specialist AI agents will analyze your work</div>
            </div>
            <div>
              <div className="font-medium mb-1">2. MeTTa Reasoning</div>
              <div>Structured knowledge graphs assess quality</div>
            </div>
            <div>
              <div className="font-medium mb-1">3. Automatic Payment</div>
              <div>20% released on agent approval</div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate(`/contract/${contractId}`)}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || submissionStatus === 'success'}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Work
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
