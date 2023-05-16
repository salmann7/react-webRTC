import { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../services/peer.js";
import { useSocket } from "../context/SocketProvider.jsx";
import Container from "../components/Container.jsx";
import { useLocation } from "react-router-dom";

const RoomPage = () => {
  const socket = useSocket();
  const [ call, setCall ] = useState(false);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [ remoteEmail, setRemoteEmail ] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const location = useLocation();
  const roomIdUrl = location.pathname.split('/')[2];

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
    setRemoteEmail(email);
  }, []);

  const handleMyStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
    setMyStream(stream);
    console.log(stream);
  }

  const handleCallUser = useCallback(async () => {
    setCall(true);
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  useEffect(() => {
    console.log("first");
    handleMyStream();
  },[])

  return (
    // <div className="container mx-auto py-8">
    //   <h1 className="text-4xl font-bold mb-4">Room Page</h1>
    //   <h4 className="text-lg mb-4">
    //     {remoteSocketId ? "Connected" : "No one in the room"}
    //   </h4>
    //   {myStream && (
    //     <button
    //       className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    //       onClick={sendStreams}
    //     >
    //       Send Stream
    //     </button>
    //   )}
    //   {remoteSocketId && (
    //     <button
    //       className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
    //       onClick={handleCallUser}
    //     >
    //       CALL
    //     </button>
    //   )}
    //   {myStream && (
    //     <>
    //       <h1 className="text-2xl font-bold mt-8 mb-4">My Stream</h1>
    //       <ReactPlayer
    //         playing
    //         muted
    //         height="200px"
    //         width="350px"
    //         url={myStream}
    //       />
    //     </>
    //   )}
    //   {remoteStream && (
    //     <>
    //       <h1 className="text-2xl font-bold mt-8 mb-4">Remote Stream</h1>
    //       <ReactPlayer
    //         playing
    //         muted
    //         height="200px"
    //         width="350px"
    //         url={remoteStream}
    //       />
    //     </>
    //   )}
    // </div>
    <Container>
        <div className="flex flex-col items-center my-5 gap-10">
            <h1 className="text-4xl text-white font-bold">Video Chat Room</h1>
            {remoteSocketId ? (
                <>
                {!call ? 
                (<div className="flex flex-col bg-blue-900 px-5 py-10 rounded-lg">
                    <h2 className="font-semibold text-green-300 text-2xl mb-2">Connected!</h2>
                    <h3 className="font-semibold text-white text-xl">You are connected to {remoteEmail}</h3>
                    <button onClick={handleCallUser} className="bg-green-400 hover:cursor-pointer font-bold text-xl mt-3 text-white px-2 py-3 rounded-full hover:bg-green-500">Call</button>
                </div>) : 
                (<>
                    <div className="w-full h-screen relative overflow-hidden p-5 bg-blue-900 rounded-lg">
                            <ReactPlayer style={{overflow: "hidden", objectFit: "cover"}} width='100%' height='100%' playing muted url={remoteStream} />
                        <div className="absolute top-3 left-3 w-96 h-48 bg-transparent shadow-md rounded-md">
                            <ReactPlayer width='100%' height='100%' playing muted url={myStream} />
                        </div>
                        <div className="absolute bottom-7 left-[50%] z-20 flex flex-row gap-3">
                        <img className=" bg-black hover:cursor-pointer p-2 rounded-full w-9 h-9 " src="/images/camera.png" alt="" />
                        <img className=" bg-black hover:cursor-pointer p-2 rounded-full w-9 h-9 " src="/images/mic.png" alt="" />
                        <img className=" bg-red-500 hover:cursor-pointer p-2 rounded-full w-9 h-9 " src="/images/phone.png" alt="" />
                        </div>
                    </div>
                </>)}
                </>
            ) : (
                <div className="flex flex-col gap-10 bg-blue-900 px-5 py-10 rounded-lg">
                    <h3 className="text-2xl font-semibold text-white">Waiting for other user to join the room!</h3>
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-white text-sm">Share below link.</h3>
                        <h2 className="font-semibold text-yellow-300 text-2xl mb-5">Ask to Join!</h2>
                        <div className="flex flex-col h-20 w-full bg-neutral-300 items-center justify-center rounded-lg">
                            <p className="font-semibold">link: http://localhost:3000/</p>
                            <p className="font-semibold">Room Id: {roomIdUrl}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </Container>
  );
};

export default RoomPage;