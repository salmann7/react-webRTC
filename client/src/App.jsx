import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import { SocketProvider } from './context/SocketProvider';

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/room/:id",
    element: <RoomPage />
  }
]);

function App() {

  return (
     <SocketProvider>
       <RouterProvider  router={router} />
     </SocketProvider>
  )
}

export default App
