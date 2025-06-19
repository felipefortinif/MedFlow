const QueueWorker = require('bull');
const path        = require('path');
const { spawn }   = require('child_process');
const fs          = require('fs').promises;

const transQueue = new QueueWorker('transcriptions', {
  redis: { host: '127.0.0.1', port: 6379 }
});

// Helper: executa script via stdin
function runScriptStdin(scriptName, inputs) {
  return new Promise((resolve, reject) => {
    console.log(`Starting script (stdin): ${scriptName}`);
    const proc = spawn('python', [path.join(__dirname, 'scripts', scriptName)]);
    proc.stdin.setDefaultEncoding('utf-8');
    inputs.forEach(line => proc.stdin.write(line + '\n'));
    proc.stdin.end();

    let stdout = '', stderr = '';
    proc.stdout.on('data', c => stdout += c.toString());
    proc.stderr.on('data', c => stderr += c.toString());

    proc.on('close', code => {
      if (code === 0) {
        console.log(`Script ${scriptName} (stdin) completed`);
        return resolve(stdout.trim());
      }
      console.error(`Script ${scriptName} error: ${stderr}`);
      reject(new Error(`Script ${scriptName} failed: ${stderr}`));
    });
  });
}

// Helper: executa script via CLI args
function runScriptArgs(scriptName, argsArray) {
  return new Promise((resolve, reject) => {
    console.log(`Starting script (args): ${scriptName} args=${argsArray}`);
    const proc = spawn('python', [path.join(__dirname, 'scripts', scriptName), ...argsArray]);

    let stdout = '', stderr = '';
    proc.stdout.on('data', c => stdout += c.toString());
    proc.stderr.on('data', c => stderr += c.toString());

    proc.on('close', code => {
      if (code === 0) {
        console.log(`Script ${scriptName} (args) completed`);
        return resolve(stdout.trim());
      }
      console.error(`Script ${scriptName} error: ${stderr}`);
      reject(new Error(`Script ${scriptName} failed: ${stderr}`));
    });
  });
}

// Process jobs with concurrency=3
transQueue.process(3, async (job) => {
  const { audioPath, paciente, data, horario } = job.data;
  console.log(`Worker processing job id=${job.id}`);

  try {
    // 1) Transcription via stdin
    const log = await runScriptStdin('transcriber.py', [audioPath, paciente, data, horario]);
    console.log(`Transcription done for job id=${job.id}`);

    // 2) Summary via CLI args
    const resumo = await runScriptArgs('resumidor.py', [paciente, data, horario, '--file', 'transcricoes.txt']);
    console.log(`Summary done for job id=${job.id}`);

    // Clean up upload file
    try {
      await fs.unlink(audioPath);
      console.log(`Uploaded file deleted: ${audioPath}`);
    } catch { /* ignore */ }

    return { resumo, log };
  } catch (error) {
    console.error(`Job id=${job.id} failed:`, error);
    // Clean up on error
    await fs.unlink(audioPath).catch(() => {});
    throw error;
  }
});

console.log('🐝 Worker de transcrição & resumo iniciado');
