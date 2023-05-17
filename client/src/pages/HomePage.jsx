import { useCallback, useEffect, useState } from "react";
import Container from "../components/Container"
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const HomePage = () => {
    const [ email, setEmail ] = useState('');
    const [ roomId, setRoomId ] = useState(null);
    const socket = useSocket();
    const navigate = useNavigate();

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        socket.emit("room:join", { email, roomId});
    },[email, roomId, socket]);

    const handleCreateRoom = useCallback((e) => {
        e.preventDefault();
        socket.emit("create:room", { email});
    },[email, socket]);
    

    const handleJoinRoom = useCallback((data) => {
        const { email, roomId } = data;
        navigate(`/room/${roomId}`);
    },[navigate]);

    const handleCreatedRoom = useCallback((data) => {
        const { email, roomId } = data;
        navigate(`/room/${roomId}?owner=true`);
    },[navigate]);

    useEffect(() => {
        socket.on("create:room", handleCreatedRoom);
        socket.on("room:join", handleJoinRoom);
        return () => {
            socket.off("create:room", handleCreatedRoom);
            socket.off("room:join", handleJoinRoom);
        }
    },[socket, handleJoinRoom, handleCreatedRoom]);

  return (
    <Container>
        <div className="flex justify-center items-center  h-screen">
            <div className="flex flex-col gap-2 items-center justify-center text-white bg-blue-900 h-4/5 md:h-4/5 rounded-xl p-5 w-full md:w-3/4 lg:w-1/2 shadow-lg">
                <h1 className="text-center text-2xl font-semibold">Welcome to PeeR2PeeR!</h1>
                <p className="text-gray-300 text-sm text-center">Experience high-quality video chat with real-time communication from anywhere in the world.</p>
                <hr/>
                <form onSubmit={handleCreateRoom} className="flex flex-col items-center w-full sm:w-1/2">
                    <label htmlFor="email" className="hidden">
                        Email:
                    </label>
                    <input type="email" required onChange={e => setEmail(e.target.value)} placeholder="Enter your email!" className="p-3 rounded-md w-full text-gray-900 font-semibold bg-gray-300 text-center mt-3"/>
                    <button type="submit" className="p-3 bg-green-300 hover:bg-green-500 hover:shadow-sm mt-4 rounded-full w-3/4 text-center font-bold text-blue-900">CREATE ROOM</button>
                </form>
                <hr />
                <p>OR</p>
                <form onSubmit={handleSubmit} className="flex flex-col items-center w-full sm:w-1/2">
                    <label htmlFor="email" className="hidden">
                        Email:
                    </label>
                    <input type="email" required onChange={e => setEmail(e.target.value)} placeholder="Enter your email!" className="p-3 rounded-md w-full text-gray-900 font-semibold bg-gray-300 text-center my-3"/>
                    <label htmlFor="roomId" className="hidden">
                        Room ID:
                    </label>
                    <input type="roomId" required onChange={e => setRoomId(e.target.value)} placeholder="Enter your Room ID!" className="p-3 rounded-md w-full text-gray-900 font-semibold bg-gray-300 text-center"/>
                    <button type="submit" className="p-3 bg-yellow-300 hover:bg-yellow-500 hover:shadow-sm mt-4 rounded-full w-3/4 text-center font-bold text-blue-900">JOIN</button>
                </form>
            </div>
        </div>
    </Container>
  )
}

export default HomePage
