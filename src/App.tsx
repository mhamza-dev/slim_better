import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { AppErrorBoundary, ErrorProvider } from './lib/errorHandling'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientForm from './pages/PatientForm'
import PatientDetail from './pages/PatientDetail'
import NotFound from './pages/NotFound'
import AppLayout from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  const router = createBrowserRouter(createRoutesFromElements(
    <Route>
      <Route index element={<Landing />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/new" element={<PatientForm />} />
        <Route path="patients/:id" element={<PatientDetail />} />
      </Route>
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Route>
  ))

  return (
    <AppErrorBoundary>
      <ErrorProvider>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AuthProvider>
      </ErrorProvider>
    </AppErrorBoundary>
  )
}

export default App
