# MedNotes - Transcrição Inteligente para Consultórios Médicos 

MedNotes é uma aplicação voltada para médicos que desejam simplificar o processo de registro de informações clínicas. A proposta é permitir que o profissional grave a consulta diretamente pelo celular, com transcrição automática da conversa e geração de observações clínicas relevantes sobre o paciente.

## 🚀 Visão Geral

Durante uma consulta médica, muitos detalhes importantes são discutidos — nomes de medicamentos, frequência de uso, alergias, condições clínicas, entre outros. O MedNotes automatiza a captura e análise dessas informações, permitindo ao médico:

- Gravar o áudio da consulta diretamente no app;
- Obter uma transcrição automática;
- Gerar observações clínicas inteligentes com base na transcrição;
- Armazenar e acessar o histórico de pacientes em uma interface web.

## 🧠 Funcionalidades

- 🎙️ **Gravação de Áudio:** Grave diretamente do celular, sem necessidade de dispositivos externos.
- ✍️ **Transcrição Automática:** Transcrição precisa da conversa médico-paciente.
- 💡 **Análise Clínica:** Extração automática de informações importantes como:
  - Medicamentos mencionados
  - Frequência de uso
  - Alergias
  - Condições pré-existentes
- 📁 **Perfil do Paciente:** Histórico de observações armazenado por paciente.
- 🌐 **Interface Web:** Visualização e gerenciamento dos registros em uma plataforma online.

## 🧰 Tecnologias

- **Frontend (Mobile):** React Native ou Flutter *(a definir)*
- **Backend/API:** Node.js com Express ou FastAPI
- **Transcrição e NLP:** OpenAI Whisper/common voice corpus 21.0 + OpenAI GPT API
- **Banco de Dados:** PostgreSQL ou MongoDB
- **Web App (Admin):** React.js

## 🔐 Privacidade e Segurança

A privacidade dos dados médicos é uma prioridade. O sistema seguirá as boas práticas de segurança e poderá ser adaptado para atender a regulamentações como a LGPD (Brasil) e HIPAA (EUA).

## 📦 Instalação (futuro)

Em breve.

## 📅 Roadmap Inicial

- [x] Definição da ideia central
- [x] Integração com a API da OpenAI
- [ ] Protótipo da interface mobile
- [ ] Sistema de autenticação de médicos
- [ ] Web app para visualização dos pacientes

## Setup

We used Python 3.9.9 and [PyTorch](https://pytorch.org/) 1.10.1 to train and test our models, but the codebase is expected to be compatible with Python 3.8-3.11 and recent PyTorch versions. The codebase also depends on a few Python packages, most notably [OpenAI's tiktoken](https://github.com/openai/tiktoken) for their fast tokenizer implementation. You can download and install (or update to) the latest release of Whisper with the following command:

    pip install -U openai-whisper

Alternatively, the following command will pull and install the latest commit from this repository, along with its Python dependencies:

    pip install git+https://github.com/openai/whisper.git 

To update the package to the latest version of this repository, please run:

    pip install --upgrade --no-deps --force-reinstall git+https://github.com/openai/whisper.git

It also requires the command-line tool [`ffmpeg`](https://ffmpeg.org/) to be installed on your system, which is available from most package managers:

```bash
# on Ubuntu or Debian
sudo apt update && sudo apt install ffmpeg

# on Arch Linux
sudo pacman -S ffmpeg

# on MacOS using Homebrew (https://brew.sh/)
brew install ffmpeg

# on Windows using Chocolatey (https://chocolatey.org/)
choco install ffmpeg

# on Windows using Scoop (https://scoop.sh/)
scoop install ffmpeg
```

You may need [`rust`](http://rust-lang.org) installed as well, in case [tiktoken](https://github.com/openai/tiktoken) does not provide a pre-built wheel for your platform. If you see installation errors during the `pip install` command above, please follow the [Getting started page](https://www.rust-lang.org/learn/get-started) to install Rust development environment. Additionally, you may need to configure the `PATH` environment variable, e.g. `export PATH="$HOME/.cargo/bin:$PATH"`. If the installation fails with `No module named 'setuptools_rust'`, you need to install `setuptools_rust`, e.g. by running:

```bash
pip install setuptools-rust
```


## 📄 Licença

Este projeto será licenciado em breve. *(Sugestão: MIT ou GPLv3)*

---

**MedNotes** — Transformando conversas clínicas em informações úteis.
