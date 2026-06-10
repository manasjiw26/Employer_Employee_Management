import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import leaveRoutes from './routes/leave.routes';
import miscRoutes from './routes/misc.routes';
import payrollRoutes from './routes/payroll.routes';
import taskRoutes from './routes/task.routes';
import balancesRoutes from './routes/balances.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/misc', miscRoutes);
app.use('/api/balances', balancesRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: err.message });
});

const server = app.listen(port, () => {
  console.log(`HRMS API listening on port ${port}`);
});

const shutdown = async () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
