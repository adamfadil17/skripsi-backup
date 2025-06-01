import { getCurrentUser } from "../actions/getCurrentUser";
import UserDashboard from "./components/UserDashboard";

export const dynamic = "force-dynamic";

const Dashboard = async () => {
  const currentUser = await getCurrentUser();

  return <UserDashboard currentUser={currentUser!} />;
};

export default Dashboard;
