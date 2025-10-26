import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, FileText, AlertCircle } from 'lucide-react';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  percentage: number;
  deadline: string;
  deliverables: string[];
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'completed';
  order: number;
}

interface MilestoneSetupProps {
  totalBudget: number;
  initialMilestones?: Milestone[];
  onMilestonesChange: (milestones: Milestone[]) => void;
  readOnly?: boolean;
}

export const MilestoneSetup: React.FC<MilestoneSetupProps> = ({
  totalBudget,
  initialMilestones = [],
  onMilestonesChange,
  readOnly = false
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (initialMilestones.length === 0 && totalBudget > 0) {
      // Create default milestones based on common patterns
      const defaultMilestones: Milestone[] = [
        {
          id: '1',
          title: 'Project Setup & Planning',
          description: 'Initial project setup, requirements analysis, and development plan',
          amount: totalBudget * 0.3,
          percentage: 30,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          deliverables: ['Project plan document', 'Technical architecture', 'Development environment setup'],
          status: 'pending',
          order: 1
        },
        {
          id: '2',
          title: 'Core Development',
          description: 'Implementation of main features and functionality',
          amount: totalBudget * 0.5,
          percentage: 50,
          deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          deliverables: ['Working prototype', 'Core features implemented', 'Unit tests'],
          status: 'pending',
          order: 2
        },
        {
          id: '3',
          title: 'Testing & Deployment',
          description: 'Final testing, bug fixes, and production deployment',
          amount: totalBudget * 0.2,
          percentage: 20,
          deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          deliverables: ['Deployed application', 'Test reports', 'Documentation'],
          status: 'pending',
          order: 3
        }
      ];
      setMilestones(defaultMilestones);
      onMilestonesChange(defaultMilestones);
    }
  }, [totalBudget, initialMilestones.length]);

  // Update milestone amounts when totalBudget changes for existing milestones
  useEffect(() => {
    if (milestones.length > 0 && totalBudget > 0) {
      const updatedMilestones = milestones.map(milestone => ({
        ...milestone,
        amount: Math.round((milestone.percentage / 100) * totalBudget)
      }));
      
      // Only update if amounts actually changed
      const amountsChanged = updatedMilestones.some((milestone, index) => 
        milestone.amount !== milestones[index].amount
      );
      
      if (amountsChanged) {
        setMilestones(updatedMilestones);
        onMilestonesChange(updatedMilestones);
      }
    }
  }, [totalBudget]);

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: `Milestone ${milestones.length + 1}`,
      description: '',
      amount: 0,
      percentage: 0,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deliverables: [''],
      status: 'pending',
      order: milestones.length + 1
    };
    
    const updatedMilestones = [...milestones, newMilestone];
    setMilestones(updatedMilestones);
    onMilestonesChange(updatedMilestones);
  };

  const removeMilestone = (id: string) => {
    const updatedMilestones = milestones.filter(m => m.id !== id)
      .map((m, index) => ({ ...m, order: index + 1 }));
    setMilestones(updatedMilestones);
    onMilestonesChange(updatedMilestones);
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    const updatedMilestones = milestones.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        
        // Auto-calculate percentage when amount changes
        if (field === 'amount') {
          updated.percentage = Math.round((value / totalBudget) * 100);
        }
        
        // Auto-calculate amount when percentage changes
        if (field === 'percentage') {
          updated.amount = Math.round((value / 100) * totalBudget);
        }
        
        return updated;
      }
      return m;
    });
    
    setMilestones(updatedMilestones);
    onMilestonesChange(updatedMilestones);
  };

  const addDeliverable = (milestoneId: string) => {
    updateMilestone(milestoneId, 'deliverables', [
      ...milestones.find(m => m.id === milestoneId)?.deliverables || [],
      ''
    ]);
  };

  const updateDeliverable = (milestoneId: string, index: number, value: string) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (milestone) {
      const updatedDeliverables = [...milestone.deliverables];
      updatedDeliverables[index] = value;
      updateMilestone(milestoneId, 'deliverables', updatedDeliverables);
    }
  };

  const removeDeliverable = (milestoneId: string, index: number) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (milestone) {
      const updatedDeliverables = milestone.deliverables.filter((_, i) => i !== index);
      updateMilestone(milestoneId, 'deliverables', updatedDeliverables);
    }
  };

  const validateMilestones = () => {
    const newErrors: string[] = [];
    const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);

    if (Math.abs(totalAmount - totalBudget) > 1) {
      newErrors.push(`Total milestone amounts ($${totalAmount.toLocaleString()}) must equal project budget ($${totalBudget.toLocaleString()})`);
    }

    if (Math.abs(totalPercentage - 100) > 1) {
      newErrors.push(`Total percentages (${totalPercentage}%) must equal 100%`);
    }

    milestones.forEach((milestone, index) => {
      if (!milestone.title.trim()) {
        newErrors.push(`Milestone ${index + 1}: Title is required`);
      }
      if (!milestone.description.trim()) {
        newErrors.push(`Milestone ${index + 1}: Description is required`);
      }
      if (milestone.amount <= 0) {
        newErrors.push(`Milestone ${index + 1}: Amount must be greater than 0`);
      }
      if (milestone.deliverables.some(d => !d.trim())) {
        newErrors.push(`Milestone ${index + 1}: All deliverables must have descriptions`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  useEffect(() => {
    validateMilestones();
  }, [milestones, totalBudget]);

  const totalAllocated = milestones.reduce((sum, m) => sum + m.amount, 0);
  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Project Milestones</h3>
          <p className="text-gray-400">Break down your project into manageable milestones</p>
        </div>
        {!readOnly && (
          <button
            onClick={addMilestone}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Milestone
          </button>
        )}
      </div>

      {/* Budget Summary */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">${totalBudget.toLocaleString()}</div>
            <div className="text-gray-400 text-sm">Total Budget</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${totalAllocated === totalBudget ? 'text-green-400' : 'text-yellow-400'}`}>
              ${totalAllocated.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Allocated</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${totalPercentage === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
              {totalPercentage}%
            </div>
            <div className="text-gray-400 text-sm">Coverage</div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-400 font-medium">Validation Errors</span>
          </div>
          <ul className="text-red-300 text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Milestones */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="bg-gray-800 rounded-lg p-6 border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  {index + 1}
                </div>
                <div>
                  {readOnly ? (
                    <h4 className="text-lg font-semibold text-white">{milestone.title}</h4>
                  ) : (
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                      className="text-lg font-semibold bg-transparent text-white border-b border-gray-600 focus:border-blue-400 outline-none"
                      placeholder="Milestone title"
                    />
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  milestone.status === 'completed' ? 'bg-green-900 text-green-400' :
                  milestone.status === 'approved' ? 'bg-blue-900 text-blue-400' :
                  milestone.status === 'submitted' ? 'bg-yellow-900 text-yellow-400' :
                  milestone.status === 'in_progress' ? 'bg-purple-900 text-purple-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {milestone.status.replace('_', ' ')}
                </span>
                
                {!readOnly && (
                  <button
                    onClick={() => removeMilestone(milestone.id)}
                    className="p-2 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                  {readOnly ? (
                    <p className="text-white">{milestone.description}</p>
                  ) : (
                    <textarea
                      value={milestone.description}
                      onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-400 outline-none"
                      rows={3}
                      placeholder="Describe what will be delivered in this milestone"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Amount
                    </label>
                    {readOnly ? (
                      <div className="text-white font-medium">${milestone.amount.toLocaleString()}</div>
                    ) : (
                      <input
                        type="number"
                        value={milestone.amount}
                        onChange={(e) => updateMilestone(milestone.id, 'amount', Number(e.target.value))}
                        className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:border-blue-400 outline-none"
                      />
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Percentage</label>
                    {readOnly ? (
                      <div className="text-white font-medium">{milestone.percentage}%</div>
                    ) : (
                      <input
                        type="number"
                        value={milestone.percentage}
                        onChange={(e) => updateMilestone(milestone.id, 'percentage', Number(e.target.value))}
                        className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:border-blue-400 outline-none"
                        max="100"
                        min="0"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Deadline
                  </label>
                  {readOnly ? (
                    <div className="text-white">{new Date(milestone.deadline).toLocaleDateString()}</div>
                  ) : (
                    <input
                      type="date"
                      value={milestone.deadline}
                      onChange={(e) => updateMilestone(milestone.id, 'deadline', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:border-blue-400 outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Right Column - Deliverables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-400">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Deliverables
                  </label>
                  {!readOnly && (
                    <button
                      onClick={() => addDeliverable(milestone.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {milestone.deliverables.map((deliverable, delIndex) => (
                    <div key={delIndex} className="flex items-center space-x-2">
                      {readOnly ? (
                        <div className="flex-1 text-white">• {deliverable}</div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={deliverable}
                            onChange={(e) => updateDeliverable(milestone.id, delIndex, e.target.value)}
                            className="flex-1 bg-gray-700 text-white rounded p-2 border border-gray-600 focus:border-blue-400 outline-none text-sm"
                            placeholder="Deliverable description"
                          />
                          <button
                            onClick={() => removeDeliverable(milestone.id, delIndex)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
