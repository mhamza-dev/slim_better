import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import AppLayout from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  const router = createBrowserRouter(createRoutesFromElements(
    <Route>
      <Route index element={<Landing />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
      </Route>
    </Route>
  ))

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
