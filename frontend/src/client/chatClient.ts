export function init() {
    const token = localStorage.getItem('token'); // TOKEN LINK FROM THE USER CONNECTED
    const chat = document.getElementById('chat-container') as HTMLFormElement | null;
    if (!chat) 
        return;
    chat.style.backgroundColor = 'rgba(196, 196, 196, 0.66)';
    const Send = document.getElementById('chat-input') as HTMLElement
    chat.addEventListener('send', async (e) => {
        const msg = (document.getElementById('message') as HTMLInputElement).value;
        console.log(msg);
        (document.getElementById('message') as HTMLInputElement).value = '';
  })
}