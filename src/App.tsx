import { useState } from 'react';
import { DataProvider } from './contexts/DataContext';
import { WalletProvider } from './contexts/WalletContext';
import { Web3Provider } from './contexts/Web3Context';
import { ContractDataProvider } from './contexts/ContractDataContext';
import { Header } from './components/Layout/Header';
import { HomePage } from './pages/HomePage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { PostJobPage } from './pages/PostJobPage';
import { ContractsPage } from './pages/ContractsPage';
import { ProfilePage } from './pages/ProfilePage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageData, setPageData] = useState<any>(null);

  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page);
    setPageData(data || null);
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'jobs':
        return <JobsPage onNavigate={handleNavigate} />;
      case 'job-detail':
        return <JobDetailPage jobId={pageData?.jobId} onNavigate={handleNavigate} />;
      case 'post-job':
        return <PostJobPage onNavigate={handleNavigate} />;
      case 'contracts':
        return <ContractsPage onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfilePage onNavigate={handleNavigate} />;
      case 'my-jobs':
        return <JobsPage onNavigate={handleNavigate} />;
      case 'messages':
        return (
          <div className="min-h-screen py-16">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Messages</h1>
              <p className="text-gray-400">
                Messaging system coming soon. Connect with clients and freelancers directly.
              </p>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="min-h-screen py-16">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Notifications</h1>
              <p className="text-gray-400">
                Stay updated with all your platform activity and contract updates.
              </p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="min-h-screen py-16">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
              <p className="text-gray-400">
                Manage your account preferences and notification settings.
              </p>
            </div>
          </div>
        );
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <Web3Provider>
      <DataProvider>
        <WalletProvider>
          <ContractDataProvider>
            <div className="min-h-screen">
              <Header onNavigate={handleNavigate} currentPage={currentPage} />
              {renderPage()}
            </div>
          </ContractDataProvider>
        </WalletProvider>
      </DataProvider>
    </Web3Provider>
  );
}

export default App;
