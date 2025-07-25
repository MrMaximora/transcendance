export function init() {
    const token = localStorage.getItem('token'); // TOKEN LINK FROM THE USER CONNECTED
    const chat = document.getElementById('chat-container') as HTMLDivElement | null;
    
    if (!chat) 
        return;
    console.log
    chat.style.backgroundColor = 'rgba(196, 196, 196, 0.66)';
    const Send = document.getElementById('chat-input') as HTMLFormElement;
    Send.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('en attents du message !')
        const msg = (document.getElementById('message') as HTMLInputElement).value;
        console.log(' message recuperer !')
        try {
            console.log('Start sended message !');
            const res = await fetch('http://localhost:3001/api/user/priv-msg/toma', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({msg}),
            });
            const data = await res.json();
            if (res)
                console.log('message send !');
            else
                console.log('failed to send message !');
        } 
        catch (error) {
            alert('failed to send message !');
            console.error('can\'t send message', error);
        }
    });
}
