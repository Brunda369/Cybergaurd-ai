import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { AuthProvider } from './context/AuthContext';
import { client } from './graphql/client';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import SimulatorPage from './pages/SimulatorPage';
import EventsMonitorPage from './pages/EventsMonitor';
import NotFoundPage from './pages/NotFoundPage';
import BlockedIpsPage from './pages/BlockedIpsPage';
import DocsPage from './pages/DocPage';
import DecoyPage from './pages/DecoyPage';

function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/portal" element={<DecoyPage />} />
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="events" element={<EventsMonitorPage />} />
                <Route path="simulator" element={<SimulatorPage />} />
                <Route path="blocked" element={<BlockedIpsPage />} />

              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ApolloProvider>
  );
}

export default App;