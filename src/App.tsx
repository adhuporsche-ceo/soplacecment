import { AuthProvider } from './context/AuthContext.tsx';
import { StudentPlacementApp } from './components/student-placement/StudentPlacementApp.tsx';

export default function App() {
  return (
    <AuthProvider>
      <StudentPlacementApp />
    </AuthProvider>
  );
}
