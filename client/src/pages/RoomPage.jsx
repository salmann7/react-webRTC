import { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../services/peer.js";
import { useSocket } from "../context/SocketProvider.jsx";
import Container from "../components/Container.jsx";
import { useLocation } from "react-router-dom";
import { TbCameraSelfie } from "react-icons/tb";

const RoomPage = () => {
  const socket = useSocket();
  const [ call, setCall ] = useState(false);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [ remoteEmail, setRemoteEmail ] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const location = useLocation();
  const roomIdUrl = location.pathname.split('/')[2];
  const [ roomOwner, setRoomOwner ] = useState(() => (location.search.split('?')[1] === 'owner=true'));
  const [ fullscreen, setFullscreen ] = useState(false);
  const [ showSelf, setShowSelf ] = useState(false);
  const [ showCamera, setShowCamera ] = useState(true);
  const [ showAudio, setShowAudio ] = useState(true);
  const [ showScreenShare, setShowScreenShare ] = useState(false);
  const [screenStream, setScreenStream] = useState();

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

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
        console.log(track);
      peer.peer.addTrack(track, myStream);
    }
    if (screenStream) {
        const screenTrack = screenStream.getVideoTracks()[0];
        peer.peer.addTrack(screenTrack, screenStream);
    }
  }, [myStream , screenStream]);

  const handleAcceptCall = useCallback(() => {
    
    // const ans = await peer.getAnswer(offer);
    // socket.emit("call:accepted", { to: from, ans });
    setCall(true);
    sendStreams();
  },[sendStreams]);

  const handleIncommingCall = useCallback(
    async ({ from, offer, email }) => {
      setRemoteSocketId(from);
      setRemoteEmail(email);
      console.log(email)
    //   const stream = await navigator.mediaDevices.getUserMedia({
    //     audio: true,
    //     video: true,
    //   });
    //   setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  

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

  const handleScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setScreenStream(screenStream);
      setShowScreenShare(true);
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = peer.peer.getSenders().find((s) => s.track.kind === "video");
      sender.replaceTrack(videoTrack);
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  };

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

//   useEffect(() => {
//     if (screenStream) {
//       const screenVideoTrack = screenStream.getVideoTracks()[0];
//       peer.peer.addTrack(screenVideoTrack, screenStream);
//     }
//   }, [screenStream]);

  const toggleCamera = useCallback(() => {
    let camera = myStream.getTracks().find(track => track.kind === 'video');
    if(camera.enabled){
        camera.enabled = false;
        setShowCamera(false);
    } else {
        camera.enabled = true;
        setShowCamera(true);
    }
  }, [myStream])

  const toggleAudio = useCallback(() => {
    let audio = myStream.getTracks().find(track => track.kind === 'audio');
    if(audio.enabled){
        audio.enabled = false;
        setShowAudio(false);
    } else {
        audio.enabled = true;
        setShowAudio(true);
    }
  }, [myStream])

  const toggleScreenShare = async () => {
    try {
      if (!showScreenShare) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenStream(screenStream);
        const videoTrack = screenStream.getVideoTracks()[0];
  
        // Find the video sender and replace its track
        const senders = peer.peer.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track && sender.track.kind === 'video'
        );
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        } else {
          // Add the video track as a new sender
          peer.peer.addTrack(videoTrack, screenStream);
        }
      } else {
        // Remove the screen track from the sender
        const senders = peer.peer.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track && sender.track.kind === 'video'
        );
        if (videoSender) {
          videoSender.replaceTrack(null);
        }
        setScreenStream(null);
  
        // Show the camera video
        // const cameraStream = await navigator.mediaDevices.getUserMedia({
        //   video: true,
        // });
        const cameraVideoTrack = myStream.getVideoTracks()[0];
  
        // Find the video sender and replace its track
        const cameraVideoSender = senders.find(
          (sender) => sender.track && sender.track.kind === 'video'
        );
        if (cameraVideoSender) {
          cameraVideoSender.replaceTrack(cameraVideoTrack);
        } else {
          // Add the video track as a new sender
          peer.peer.addTrack(cameraVideoTrack, myStream);
        }
      }
  
      setShowScreenShare(!showScreenShare);
      
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };
  

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
    remoteStream
  ]);

  useEffect(() => {
    console.log("first");
    handleMyStream();
    
  },[])

  return (
    <>
    {!fullscreen ? (
    <Container>
        <div className="flex flex-col items-center my-5 gap-10">
            <h1 className="text-4xl text-white font-bold">Video Chat Room</h1>
            {remoteSocketId ? (
                <>
                {!call ? 
                (
                <>   {roomOwner ? (
                    <div className="flex flex-col bg-blue-900 px-5 py-10 rounded-lg w-full md:w-3/4 lg:w-1/2 items-center">
                        <h3 className="font-semibold text-white text-md w-full text-start">You are connected to {remoteEmail}</h3>
                        <h2 className="font-semibold text-green-300 text-2xl mb-2 w-full text-start">Connected!</h2>
                        <button onClick={handleCallUser} className="bg-green-400 w-full sm:w-1/2 hover:cursor-pointer font-bold text-xl mt-3 text-white px-2 py-3 rounded-full hover:bg-green-500">CALL</button>
                    </div>
                ):(
                    <div className="flex flex-col bg-blue-900 px-5 py-10 rounded-lg w-full md:w-3/4 lg:w-1/2 items-center">
                        <h3 className="font-semibold text-white text-md w-full text-start">Call from {remoteEmail}</h3>
                        <h2 className="font-semibold text-green-300 text-2xl mb-2 w-full text-start">Incomming Call!</h2>
                        <button onClick={handleAcceptCall} className="bg-green-400 w-full sm:w-1/2 hover:cursor-pointer flex justify-center font-bold text-xl mt-3 text-white px-2 py-3 rounded-full hover:bg-green-500">
                            ACCEPT
                        </button>
                    </div>
                )}
                    
                </> 
                ) : 
                (<>
                    <div className="w-full h-screen relative overflow-hidden p-5 bg-neutral-900 rounded-lg">
                        <div className="absolute top-3 right-3 z-30">
                            <button onClick={() => setFullscreen((p) => !p)} className="text-white text-xs bg-neutral-500 hover:bg-neutral-600 px-2 py-1 rounded-full font-semibold">Fullscreen</button>
                        </div>
                            <ReactPlayer style={{overflow: "hidden", objectFit: "cover"}} width='100%' height='100%' playing muted url={remoteStream} />
                        {showSelf && <div className="absolute top-3 left-3 w-96 h-48 bg-transparent shadow-md rounded-md">
                            <ReactPlayer width='100%' height='100%' playing muted url={myStream} />
                        </div>}
                        <div className="absolute bottom-7 left-1/2 transform -translate-x-1/2 z-20 flex flex-row justify-center items-center gap-3">
                            <TbCameraSelfie onClick={() => setShowSelf((p) => !p)} className={` ${showSelf ? 'bg-gray-900':'bg-black'} text-white hover:cursor-pointer p-2 rounded-full w-9 h-9 flex-shrink-0`} /> 
                            <img onClick={toggleCamera} className={`${showCamera ? 'bg-black':'bg-red-500'} hover:cursor-pointer p-2 rounded-full w-9 h-9`} src="/images/camera.png" alt="" />
                            <img onClick={toggleAudio} className={`${showAudio ? 'bg-black':'bg-red-500'} hover:cursor-pointer p-2 rounded-full w-9 h-9`} src="/images/mic.png" alt="" />
                            <button onClick={toggleScreenShare} className={`${!showScreenShare ? 'bg-black':'bg-blue-500'} hover:cursor-pointer px-4 py-2 rounded-full text-white font-semibold text-sm`}>Share Screen</button>
                            <img className=" bg-red-500 hover:cursor-pointer hover:bg-red-600 p-2 rounded-full w-9 h-9 " src="/images/phone.png" alt="" />
                        </div>
                    </div>
                </>)}
                </>
            ) : (
                <>
                {roomOwner ? (
                    <div className="flex flex-col gap-10 bg-blue-900 px-5 py-10 rounded-lg w-full md:w-3/4 lg:w-1/2">
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
                ):(
                    <div className="flex flex-col gap-2 bg-blue-900 px-5 py-10 rounded-lg items-center w-full md:w-3/4 lg:w-1/2">
                        <h3 className="text-md font-semibold text-white text-start w-full">Waiting for user to add you in the call!</h3>
                        <h2 className="font-semibold text-yellow-300 text-2xl mb-3 w-full text-start">Waiting...</h2>
                        <button className="bg-red-400 hover:cursor-pointer font-bold text-xl mt-3 text-white px-2 py-3 rounded-full hover:bg-red-500 w-full sm:w-1/2">LEAVE</button>
                    </div>
                )}
                
                </>
            )}
        </div>
    </Container>
    ):(
        <div className="w-full h-screen relative overflow-hidden p-5 bg-neutral-900 rounded-lg">
            <div className="absolute top-3 right-3 z-30">
                <button onClick={() => setFullscreen((p) => !p)} className="text-white text-xs bg-neutral-500 hover:bg-neutral-600 px-2 py-1 rounded-full font-semibold">Fullscreen</button>
            </div>
            <ReactPlayer style={{overflow: "hidden", objectFit: "cover"}} width='100%' height='100%' playing muted url={remoteStream} />
            {showSelf && <div className="absolute top-3 left-3 w-96 h-48 bg-transparent shadow-md rounded-md">
                <ReactPlayer width='100%' height='100%' playing muted url={myStream} />
            </div>}
            <div className="absolute bottom-7 left-1/2 transform -translate-x-1/2 z-20 flex flex-row justify-center items-center gap-3">
                <TbCameraSelfie onClick={() => setShowSelf((p) => !p)} className={` ${showSelf ? 'bg-gray-900':'bg-black'} text-white hover:cursor-pointer p-2 rounded-full w-9 h-9`} /> 
                <img onClick={toggleCamera} className={`${showCamera ? 'bg-black':'bg-red-500'} hover:cursor-pointer p-2 rounded-full w-9 h-9`} src="/images/camera.png" alt="" />
                <img onClick={toggleAudio} className={`${showAudio ? 'bg-black':'bg-red-500'} hover:cursor-pointer p-2 rounded-full w-9 h-9`} src="/images/mic.png" alt="" />
                <button onClick={toggleScreenShare} className={`${!showScreenShare ? 'bg-black':'bg-blue-500'} hover:cursor-pointer px-4 py-2 rounded-full text-white font-semibold text-sm`}>Share Screen</button>
                <img className=" bg-red-500 hover:cursor-pointer p-2 rounded-full w-9 h-9 " src="/images/phone.png" alt="" />
            </div>
        </div>
    )}
    </>
  );
};

export default RoomPage;