# MedFlow - Transcrição Inteligente para Consultórios Médicos 

MedFlow é uma aplicação voltada para médicos que desejam simplificar o processo de registro de informações clínicas. A proposta é permitir que o profissional grave a consulta diretamente pelo celular, com transcrição automática da conversa e geração de observações clínicas relevantes sobre o paciente.

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

- **Frontend:** Angular
- **Backend/API:** Django
- **Transcrição e NLP:** OpenAI Whisper/common voice corpus 21.0 + OpenAI GPT API
- **Banco de Dados:** PostgreSQL

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

## 📄 Licença

Este projeto será licenciado em breve. *(Sugestão: MIT ou GPLv3)*

---

**MedFlow** — Transformando conversas clínicas em informações úteis.
