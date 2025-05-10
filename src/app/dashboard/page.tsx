import { getCurrentUser } from '../actions/getCurrentUser';
import UserDashboard from './components/UserDashboard';

const Dashboard = async () => {
  // Fetch the current user server-side
  const currentUser = await getCurrentUser();

  // Pass the currentUser to the client component
  return <UserDashboard currentUser={currentUser!} />;
};

export default Dashboard;
