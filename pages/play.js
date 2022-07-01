import { useEffect, useRef, useState } from "react"
import { formatHHMMSS } from "../lib/util";
import cn from 'classnames';

const url = "ws://127.0.0.1:8000"

export default function Component() {
    const [text, setText] = useState("");
    const [game, setGame] = useState({ connected: false });

    function play() {
        setText("");
        const ws = new WebSocket(url);
        ws.onopen = () => {
            ws.send("Hello world!");
            setGame(game => ({...game, connected: true}));
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "msg") setText(text => text + formatHHMMSS(new Date()) + ": " + data.msg + '\n');
        };
        ws.onclose = () => {
            setText(text => text + "Connection closed.\n");
            setGame(game => ({...game, connected: false}));
    }

    return () => {
        ws.close();
    };
};

return <div className="flex flex-col gap-3 items-start">
    <pre className={cn({ ['hidden']: !text }) + " block min-w-[400px] min-h-[200px] bg-sky-700 p-2"}>
        {text}
    </pre>
    <button className={cn({ ['hidden']: game.connected })} onClick={play}>Play</button>
</div>
}