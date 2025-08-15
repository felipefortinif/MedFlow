document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('patient-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const cpf = document.getElementById('cpf').value.trim();
        const nasc = document.getElementById('nascimento').value;

        if (!nome || !cpf || !nasc) {
            alert('Preencha todos os campos.');
            return;
        }

        // Envia apenas o NOME na query string
        const params = new URLSearchParams({ nome });
        window.location.href = `gravar.html?${params.toString()}`;
    });
});
