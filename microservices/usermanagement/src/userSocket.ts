import dotenv from 'dotenv'
import io from 'socket.io-client'

dotenv.config();

export interface ChatMessage {
    from: string;
    for: string;

    text: string;
    timestamp?: number;
}

export function creatUserSocket(userid : number) 
{
    const socket = io(process.env.URL_CHAT, {

    });

    socket.on("connect", () => {
        socket.emit("register-socket", userid);
        console.log("socket registed !");
    })

    socket.on("message", (msg: ChatMessage) => {
        alert('New message !');
    })

    socket.on("disconnect", () => {
        console.log("disconnected !");
    });
}