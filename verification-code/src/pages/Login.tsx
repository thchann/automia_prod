import { Link } from "react-router-dom";

const Login = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
    <h1 className="text-2xl font-semibold text-foreground">Login</h1>
    <Link to="/" className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">
      Back to home
    </Link>
  </div>
);

export default Login;
