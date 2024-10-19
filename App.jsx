import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';

const VideoCallScreen = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCalling, setIsCalling] = useState(false); // flag to prevent multiple calls
  const pc = useRef(null);
  const socket = useRef(null); 

  useEffect(() => {
    // Initialize WebSocket connection
    socket.current = io('https://your-signaling-server.com'); 

    // Configure WebRTC peer connection
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    pc.current = new RTCPeerConnection(configuration);

    // Capture local video stream
    mediaDevices.getUserMedia({
      video: true,
      audio: true,
    }).then(stream => {
      setLocalStream(stream);
      pc.current.addStream(stream); // Add local stream to peer connection
    });

    // Listen for remote stream
    pc.current.onaddstream = (event) => {
      setRemoteStream(event.stream);
    };

    // Set ICE candidate handler
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('ice-candidate', event.candidate);
      }
    };

    // Listen for signaling server messages
    socket.current.on('offer', handleOffer);
    socket.current.on('answer', handleAnswer);
    socket.current.on('ice-candidate', handleIceCandidate);

    return () => {
      pc.current.close();
      socket.current.disconnect();
    };
  }, []);

  const handleOffer = async (offer) => {
    await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);
    socket.current.emit('answer', answer);
  };

  const handleAnswer = async (answer) => {
    await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = (candidate) => {
    pc.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const startCall = async () => {
    if (isCalling) return; // Prevent multiple call initiations
    setIsCalling(true); // Set the flag to true once the call starts

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    socket.current.emit('offer', offer);
  };

  return (
    <View style={{ flex: 1 }}>
      <Text>Video Call Screen</Text>
      {localStream && <RTCView streamURL={localStream.toURL()} style={{ width: 200, height: 200 }} />}
      {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={{ width: 200, height: 200 }} />}
      <Button title="Start Call" onPress={startCall} />
    </View>
  );
};

export default VideoCallScreen;
