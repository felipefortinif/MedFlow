require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const multer    = require('multer');
const Queue     = require('bull');
const path      = require('path');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Configure Multer
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Create a Bull queue (requires Redis running)
const transQueue = new Queue('transcriptions', {
  redis: { host: '127.0.0.1', port: 6379 }
});

// POST /consulta ➔ cria job e retorna jobId
app.post('/consulta', upload.single('audio'), async (req, res) => {
  const audioPath = req.file.path;
  const { paciente, data, horario } = req.body;
  const job = await transQueue.add({ audioPath, paciente, data, horario });
  res.status(202).json({ jobId: job.id });
});

// GET /consulta/:id ➔ informa status ou resultado
app.get('/consulta/:id', async (req, res) => {
  const job = await transQueue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job não encontrado' });

  const state = await job.getState();
  if (state === 'completed') {
    const { resumo, log } = job.returnvalue;
    return res.json({ status: state, resumo, log });
  }

  if (state === 'failed') {
    return res.json({ status: state, reason: job.failedReason });
  }

  res.json({ status: state });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));