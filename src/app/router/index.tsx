import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../layout/AppLayout'
import { UploadPage } from '../../pages/UploadPage'
import { ClassDashboard } from '../../pages/ClassDashboard'
import { StudentAnalysisPage } from '../../pages/StudentAnalysisPage'
import { CommentsPage } from '../../pages/CommentsPage'
import { SettingsPage } from '../../pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/upload" replace /> },
      { path: '/upload', element: <UploadPage /> },
      { path: '/class-analysis', element: <ClassDashboard /> },
      { path: '/student-analysis', element: <StudentAnalysisPage /> },
      { path: '/comments', element: <CommentsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
