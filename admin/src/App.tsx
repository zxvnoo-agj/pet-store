import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Categories from './pages/Categories'
import Reviews from './pages/Reviews'

import Spus from './pages/Spus'
import SpuDetail from './pages/Spus/Detail'
import MatchingQueue from './pages/MatchingQueue'
import PetBreeds from './pages/PetBreeds'
import ToastContainer from './components/ToastContainer'
import { useAuthStore } from './stores/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore()
  return isLoggedIn ? <>{children}</> : <Navigate to="/" replace />
}

function App() {
  return (
    <>
      <ToastContainer />
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <PrivateRoute>
              <Categories />
            </PrivateRoute>
          }
        />
        <Route
          path="/reviews"
          element={
            <PrivateRoute>
              <Reviews />
            </PrivateRoute>
          }
        />
        <Route
          path="/spus"
          element={
            <PrivateRoute>
              <Spus />
            </PrivateRoute>
          }
        />
        <Route
          path="/spus/:id"
          element={
            <PrivateRoute>
              <SpuDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/matching-queue"
          element={
            <PrivateRoute>
              <MatchingQueue />
            </PrivateRoute>
          }
        />
        <Route
          path="/pet-breeds"
          element={
            <PrivateRoute>
              <PetBreeds />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
