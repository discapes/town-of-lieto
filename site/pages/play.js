import { useEffect, useRef, useState } from "react"
import { formatHHMMSS, useExtendedState } from "../lib/util";
import cn from 'classnames';

const url = "ws://127.0.0.1:8000";

function escapeHTML(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export default function Component() {
    const [timer, setTimer] = useState(" ");
    const [text, setText, textRef] = useExtendedState("");
    const [game, setGame, gameRef] = useState({ connected: false, ws: null });
    const [asking, setAsking, askingRef] = useState(false);
    const [chatting, setChatting, chattingRef] = useState(false);
    const textFieldRef = useRef();


    let finalText = text;
    if (asking) {
        finalText += '> ';
    }

    function play() {
        setText("");
        setAsking(false);
        setChatting(false);
        setTimer(" ");
        setGame({ connected: false, ws: null });
        const ws = new WebSocket(url);
        ws.onopen = () => {
            ws.send("Hello world!");
            setGame({ connected: true, ws });
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "msg":
                    setText(text => text + formatHHMMSS(new Date()) + ": " + escapeHTML(data.msg) + '\n');
                    break;
                case "text":
                    setGame(game => ({ ...game, started: true }))
                    setText(text => text + escapeHTML(data.text) + '\n');
                    break;
                case "question":
                    setAsking(true);
                    setText(text => text + `<i>${escapeHTML(data.text)}</i>\n`);
                    break;
                case "stopinput":
                    setAsking(false);
                    setChatting(false);
                    break;
                case "chatting":
                    setChatting(true);
                    break;
                case "wait": 
                    newWait(new Date(data.finish));
                    break;
            }
        };
        ws.onclose = () => {
            setAsking(false);
            setText(text => text + "<b>Connection closed.</b>\n");
            setGame({ connected: false });
        }

        return () => {
            ws.close();
        };
    };
    useEffect(() => {
        const tf = textFieldRef.current;
        console.log("%s, %s, %s", tf.scrollHeight - tf.scrollTop - tf.clientHeight, tf.clientHeight);
        if (tf.scrollHeight - tf.scrollTop - tf.clientHeight > tf.clientHeight - 100) return;
        tf.scrollTop = tf.scrollHeight;
    }, [finalText]);

    let timerRef = useRef();
    function newWait(finish) {
        if (new Date() > finish) {
            setTimer(" ");
            return clearInterval(timerRef.current);
        }
        setTimer(Math.ceil((finish - new Date())/1000));
        timerRef.current = setInterval(() =>{
            if (Date.now() > finish) {
                setTimer(" ");
                return clearInterval(timerRef.current);
            }
            setTimer(Math.ceil((finish - new Date())/1000));
        }, 1000);
    }

    function onInput(e) {
        if (e.key !== "Enter") return;
        game.ws.send(e.target.value);
        if (asking) setText(text + escapeHTML("> " + e.target.value) + '\n');
        e.target.value = "";
        setAsking(false);
    }

    return <div className="flex flex-col gap-3 items-start">
        <pre>{timer}</pre>
        <pre className={cn({ ['hidden']: !text }) + " overflow-x-hidden w-[400px] whitespace-pre-wrap overflow-y-scroll block max-w-[400px] max-h-[400px] min-h-[200px] bg-sky-700 p-2"} ref={textFieldRef} dangerouslySetInnerHTML={{ __html: finalText }}>
        </pre>
        <input className={cn({ ['hidden']: !(game.connected && (asking || chatting)) }) + " bg-sky-700 p-2 border border-white"} onKeyUp={onInput}></input>
        <button className={cn({ ['hidden']: game.connected })} onClick={play}>Play</button>
    </div >
}