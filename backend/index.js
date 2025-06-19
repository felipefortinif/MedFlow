require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const multer    = require('multer');
const Queue     = require('bull');
const path      = require('path');

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
  console.log('Received POST /consulta');
  const audioPath = req.file.path;
  const { paciente, data, horario } = req.body;
  console.log(`Enqueue job: patient=${paciente}, date=${data}, time=${horario}, audioPath=${audioPath}`);

  try {
    const job = await transQueue.add({ audioPath, paciente, data, horario });
    console.log(`Job queued with id=${job.id}`);
    res.status(202).json({ jobId: job.id });
  } catch (err) {
    console.error('Failed to enqueue job:', err);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

// GET /consulta/:id ➔ informa status ou resultado
app.get('/consulta/:id', async (req, res) => {
  const jobId = req.params.id;
  console.log(`Received GET /consulta/${jobId}`);

  const job = await transQueue.getJob(jobId);
  if (!job) {
    console.warn(`Job not found: id=${jobId}`);
    return res.status(404).json({ error: 'Job não encontrado' });
  }

  const state = await job.getState();
  console.log(`Job id=${jobId} state=${state}`);

  if (state === 'completed') {
    const { resumo, log } = job.returnvalue;
    console.log(`Job id=${jobId} completed`);
    return res.json({ status: state, resumo, log });
  }

  if (state === 'failed') {
    console.error(`Job id=${jobId} failed: ${job.failedReason}`);
    return res.json({ status: state, reason: job.failedReason });
  }

  // pending or active
  res.json({ status: state });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
// optional: adjust server timeouts if needed
server.setTimeout(10 * 60 * 1000);      // 10 min
server.keepAliveTimeout = 65 * 1000;
