const QueueWorker = require('bull');
const path        = require('path');
const { spawn }   = require('child_process');

const transQueue = new QueueWorker('transcriptions', {
  redis: { host: '127.0.0.1', port: 6379 }
});

// Helper: executa um script Python e envia linhas de stdin
function runScript(scriptName, inputs) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python', [path.join(__dirname, 'scripts', scriptName)]);
    proc.stdin.setDefaultEncoding('utf-8');
    inputs.forEach(line => proc.stdin.write(line + '\n'));
    proc.stdin.end();

    let stdout = '', stderr = '';
    proc.stdout.on('data', c => stdout += c.toString());
    proc.stderr.on('data', c => stderr += c.toString());

    proc.on('close', code => {
      if (code === 0) return resolve(stdout.trim());
      reject(new Error(`Script ${scriptName} failed: ${stderr}`));
    });
  });
}

// Processamento de jobs
transQueue.process(async (job) => {
  const { audioPath, paciente, data, horario } = job.data;

  // 1) Transcrição (usa transcriber.py)
  const log = await runScript('transcriber.py', [audioPath, paciente, data, horario]);

  // 2) Resumo (usa resumidor.py)
  const resumo = await runScript('resumidor.py', [paciente, data, horario]);

  return { resumo, log };
});

console.log('🐝 Worker de transcrição & resumo iniciado');