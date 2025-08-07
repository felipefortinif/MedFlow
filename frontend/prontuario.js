document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const nome = (params.get('nome') || '').trim();

    if (!nome) return location.replace('index.html');

    document.getElementById('patient-name').textContent = nome;
});
