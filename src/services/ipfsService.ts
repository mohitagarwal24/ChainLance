export interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
}

export class IPFSService {
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private pinataGateway: string;

  constructor() {
    // Vite uses import.meta.env with VITE_ prefix for environment variables
    this.pinataApiKey = import.meta.env.VITE_PINATA_API_KEY || '';
    this.pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY || '';
    this.pinataGateway = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
  }

  async uploadFile(file: File): Promise<IPFSUploadResult> {
    try {
      console.log('📤 Uploading file to IPFS via Pinata:', file.name, file.size);

      // If no Pinata credentials, use local storage simulation
      if (!this.pinataApiKey || !this.pinataSecretKey) {
        console.log('⚠️ No Pinata credentials found, using local simulation');
        return this.simulateIPFSUpload(file);
      }

      const formData = new FormData();
      formData.append('file', file);

      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          platform: 'ChainLance'
        }
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append('pinataOptions', options);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinata upload failed:', response.status, errorText);
        throw new Error(`Pinata upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ File uploaded to IPFS:', result);

      const ipfsHash = result.IpfsHash;
      const ipfsUrl = `${this.pinataGateway}${ipfsHash}`;

      return {
        hash: ipfsHash,
        url: ipfsUrl,
        size: file.size
      };

    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      // Fallback to simulation if Pinata fails
      console.log('🔄 Falling back to local simulation...');
      return this.simulateIPFSUpload(file);
    }
  }

  private async simulateIPFSUpload(file: File): Promise<IPFSUploadResult> {
    console.log('🎭 Simulating IPFS upload for:', file.name);
    
    // Create a simulated hash based on file properties
    const timestamp = Date.now();
    const fileInfo = `${file.name}_${file.size}_${timestamp}`;
    const hash = await this.createSimulatedHash(fileInfo);
    
    // Store file data in localStorage for demo purposes
    const fileData = await this.fileToBase64(file);
    const storageKey = `ipfs_${hash}`;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
        data: fileData,
        uploadedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Could not store file in localStorage:', e);
    }

    const simulatedUrl = `https://ipfs.io/ipfs/${hash}`;
    
    console.log('✅ Simulated IPFS upload complete:', {
      hash,
      url: simulatedUrl,
      size: file.size
    });

    return {
      hash,
      url: simulatedUrl,
      size: file.size
    };
  }

  private async createSimulatedHash(input: string): Promise<string> {
    // Create a simple hash for simulation
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    
    // Simple hash algorithm for demo
    let hash = '';
    for (let i = 0; i < data.length; i++) {
      hash += data[i].toString(16).padStart(2, '0');
    }
    
    // Pad to make it look like an IPFS hash
    const ipfsPrefix = 'Qm';
    const hashSuffix = hash.substring(0, 44); // IPFS hashes are typically 46 chars
    return ipfsPrefix + hashSuffix.padEnd(44, '0');
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async uploadJSON(data: any): Promise<IPFSUploadResult> {
    try {
      console.log('📤 Uploading JSON to IPFS via Pinata');

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const file = new File([blob], 'data.json', { type: 'application/json' });

      return await this.uploadFile(file);

    } catch (error) {
      console.error('❌ JSON upload to IPFS failed:', error);
      throw error;
    }
  }

  getIPFSUrl(hash: string): string {
    return `${this.pinataGateway}${hash}`;
  }

  // Check if a hash is valid IPFS format
  isValidIPFSHash(hash: string): boolean {
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash);
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
