import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="text-accent underline">
        Back to home
      </Link>
    </div>
  );
}
