import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import { ContractDetailPage } from './pages/ContractDetailPage';
import { AcceptBidPage } from './pages/AcceptBidPage';
import { WorkSubmissionPage } from './pages/WorkSubmissionPage';
import { ProfilePage } from './pages/ProfilePage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Web3Provider>
      <DataProvider>
        <WalletProvider>
          <ContractDataProvider>
            <Router>
              <div className="min-h-screen">
                <Header />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/job/:jobId" element={<JobDetailPage />} />
                  <Route path="/post-job" element={<PostJobPage />} />
                  <Route path="/contracts" element={<ContractsPage />} />
                  <Route path="/contract/:contractId" element={<ContractDetailPage />} />
                  <Route path="/accept-bid/:jobId/:bidId" element={<AcceptBidPage />} />
                  <Route path="/submit-work/:contractId" element={<WorkSubmissionPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </div>
            </Router>
          </ContractDataProvider>
        </WalletProvider>
      </DataProvider>
    </Web3Provider>
  );
}

export default App;
