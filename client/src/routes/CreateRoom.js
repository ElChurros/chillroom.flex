import React, { useContext } from "react";
import { v1 as uuid } from "uuid";
import AudioCtx from "../contexts/AudioCtx"

const CreateRoom = (props) => {
    
    const audioCtx = useContext(AudioCtx)

    function create() {
        const id = uuid();
        audioCtx.resume();
        props.history.push(`/room/${id}`);
    }

    return (
        <button onClick={create}>Create room</button>
    );
};

export default CreateRoom;
