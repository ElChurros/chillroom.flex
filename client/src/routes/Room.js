import React, { useEffect, useRef, useState, useContext, useCallback } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import AudioCtx from '../contexts/AudioCtx'
import useEventListener from '../hooks/useEventListener'
import Canvas from '../components/Canvas'
import styles from './room.module.css'

const AudioTrack = ({ peer, pos }) => {
    const ref = useRef();
    const pannerRef = useRef();
    const audioCtx = useContext(AudioCtx)

    const positionPanner = useCallback((panner, pos) => {
        if (panner.positionX) {
            panner.positionX.setValueAtTime(pos.x, 0);
            panner.positionY.setValueAtTime(pos.y, 0);
        } else {
            panner.setPosition(pos.x, pos.y, 0);
        }
        if(panner.orientationX) {
            panner.orientationX.setValueAtTime(Math.cos(pos.dir * Math.PI / 180), 0)
            panner.orientationY.setValueAtTime(Math.sin(pos.dir * Math.PI / 180), 0)
        } else {
            panner.setOrientation(Math.cos(pos.dir * Math.PI / 180), Math.sin(pos.dir * Math.PI / 180), 1)
        }
    }, [audioCtx])

    useEffect(() => {
        peer.on("stream", stream => {
            const source = audioCtx.createMediaStreamSource(stream)
            // const source = audioCtx.createOscillator(400)
            // source.start()
            pannerRef.current = audioCtx.createPanner()
            pannerRef.current.panningModel = 'HRTF';
            pannerRef.current.distanceModel = 'exponential';
            pannerRef.current.refDistance = 25;
            pannerRef.current.maxDistance = 10000;
            pannerRef.current.rolloffFactor = 1;
            pannerRef.current.coneInnerAngle = 60;
            pannerRef.current.coneOuterAngle = 90;
            pannerRef.current.coneOuterGain = 0.9;
            source.connect(pannerRef.current).connect(audioCtx.destination)
            positionPanner(pannerRef.current, pos)
            ref.current.srcObject = stream;
        })
        // eslint-disable-next-line
    }, [audioCtx, peer]);

    useEffect(() => {
        if (!pannerRef.current)
            return
        console.log(pos)
        positionPanner(pannerRef.current, pos)
        console.log(pannerRef.current)
        console.log("panner position ", pannerRef.current.positionX.value, pannerRef.current.positionY.value, pannerRef.current.positionZ.value)
        console.log("panner orientation ", pannerRef.current.orientationX.value, pannerRef.current.orientationY.value, pannerRef.current.orientationZ.value)
    }, [positionPanner, pos])

    return (
        <audio ref={ref}></audio>
    );
}

const Room = ({ match }) => {

    const roomID = match.params.roomID;

    //Ref to the socket used to communicate with the server
    const socketRef = useRef();

    // State holding player Ids and positions
    const [players, setPlayers] = useState([])

    // Reference holding the actual peer connections
    const peersRef = useRef([]);

    const [imageLoaded, setImageLoaded] = useState(false)
    const imageRef = useRef()

    const audioCtx = useContext(AudioCtx)

    useEffect(() => {
        imageRef.current = new Image()
        imageRef.current.onload = () => setImageLoaded(true)
        
        imageRef.current.src = `${process.env.PUBLIC_URL}/arrow.svg`

        //Connect to socket.io server
        socketRef.current = io.connect(process.env.REACT_APP_SERVER);

        //Get access to microphone
        navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(stream => {
            //Tell the server we want to join the room
            console.log("emitting join room event");
            socketRef.current.emit("join room", roomID);
            //When server answers, init state and peer connections for every person in the room
            socketRef.current.on("all users", users => {
                console.log("all users : ", users)
                const players = []
                users.forEach(user => {
                    const { id, pos } = user
                    if (id !== socketRef.current.id) {
                        const peer = createPeer(id, socketRef.current.id, stream);
                        peersRef.current.push({
                            peerID: id,
                            peer,
                        })
                        players.push({ id, pos, peer })
                    } else {
                        players.push({ id, pos })
                        if (audioCtx.listener.positionX) {
                            audioCtx.listener.positionX.setValueAtTime(pos.x, 0);
                            audioCtx.listener.positionY.setValueAtTime(pos.y, 0);
                            audioCtx.listener.positionZ.setValueAtTime(0, 0);
                        } else {
                            audioCtx.listener.setPosition(pos.x, pos.y, 0);
                        }
                        if (audioCtx.listener.forwardX) {
                            audioCtx.listener.forwardX.setValueAtTime(Math.cos(pos.dir * Math.PI / 180), 0)
                            audioCtx.listener.forwardY.setValueAtTime(Math.sin(pos.dir * Math.PI / 180), 0)
                            audioCtx.listener.forwardZ.setValueAtTime(-1, 0)
                            audioCtx.listener.upX.setValueAtTime(0, 0)
                            audioCtx.listener.upY.setValueAtTime(0, 0)
                            audioCtx.listener.upZ.setValueAtTime(-1, 0)
                        } else {
                            audioCtx.listener.setOrientation(Math.cos(pos.dir * Math.PI / 180), Math.sin(pos.dir * Math.PI / 180), -1, 0, 0, -1)
                        }
                    }
                })
                setPlayers(players);
            })

            socketRef.current.on("user joined", payload => {
                console.log("user joined : ", payload)
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })
                setPlayers(prev => [...prev, { id: payload.callerID, pos: payload.pos, peer: peer }])
            });
        })

        return () => socketRef.current.disconnect()

    }, [roomID]);

    //Players movements handling
    useEffect(() => {
        socketRef.current.on("player moved", payload => {
            console.log("player moved : ", payload)
            const p = [...players]
            p.find(pl => pl.id === payload.id).pos = payload.pos
            setPlayers(p)
            if (payload.id === socketRef.current.id) {
                const { pos } = payload
                console.log(pos)
                if (audioCtx.listener.positionX) {
                    audioCtx.listener.positionX.setValueAtTime(pos.x, 0);
                    audioCtx.listener.positionY.setValueAtTime(pos.y, 0);
                } else {
                    audioCtx.listener.setPosition(pos.x, pos.y, 0);
                }
                if (audioCtx.listener.forwardX) {
                    audioCtx.listener.forwardX.setValueAtTime(Math.cos(pos.dir * Math.PI / 180), 0)
                    audioCtx.listener.forwardY.setValueAtTime(Math.sin(pos.dir * Math.PI / 180), 0)
                } else {
                    audioCtx.listener.setOrientation(Math.cos(pos.dir * Math.PI / 180), Math.sin(pos.dir * Math.PI / 180), -1, 0, 0, -1)
                }
            }
        })

        console.log(audioCtx.listener)

        return () => socketRef.current.off("player moved")
    }, [players])

    // Simple-peer handshake initialization 
    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        socketRef.current.on("receiving returned signal", payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            item.peer.signal(payload.signal);
        });

        return peer;
    }

    // Handshake
    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    const handler = (e) => {
        if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) {
            socketRef.current.emit("move", e.key)
        }
    }

    useEventListener("keydown", handler)

    function drawPlayers(context) {
        if (!imageLoaded)
            return
        players.forEach(player => {
            context.translate(player.pos.x / 4 + 10, player.pos.y / 4 + 10)
            context.rotate((player.pos.dir) * Math.PI / 180)
            context.translate(-player.pos.x / 4 - 10, -player.pos.y / 4 - 10)
            context.drawImage(imageRef.current, player.pos.x / 4, player.pos.y / 4, 20, 20)
            context.setTransform(1, 0, 0, 1, 0, 0);
        })
    }

    return (
        <>
            {players.filter(p => p.id !== socketRef.current.id).map((player, index) => {
                const { peer, pos } = player
                return (
                    <AudioTrack key={index} peer={peer} pos={pos} />
                );
            })}
            <Canvas className={styles.canvas} height="200" width="300" draw={drawPlayers}>
                Your browser does not support the HTML5 canvas tag.
            </Canvas>
            {audioCtx.state !== 'running'
                ? <button onClick={() => {audioCtx.resume()}}>Activate audio</button>
                : null
            }
        </>
    );
};

export default Room;
