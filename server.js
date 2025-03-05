const express = require('express');
const mariadb = require('mariadb');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

// Create a connection pool to the database
const pool = mariadb.createPool({
    host: '104.248.57.110',
    user: 'myuser',
    password: '2627',
    database: 'sample',
    connectionLimit: 10,
    idleTimeout: 30000,
    connectTimeout: 30000
});

// Middleware to parse JSON requests
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Sample API',
            version: '1.0.0',
            description: 'API for managing agents, customers, and orders',
        },
        servers: [
            {
                url: `http://104.248.57.110:${port}`,
                description: 'DigitalOcean Server',
            },
        ],
    },
    apis: ['./server.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// GET /agents - Fetch all agents
/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Fetch all agents
 *     responses:
 *       200:
 *         description: A list of agents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agent'
 */
app.get('/agents', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM agents');
        res.setHeader('Content-Type', 'application/json');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.end();
    }
});

// POST /agents - Add a new agent
/**
 * @swagger
 * /agents:
 *   post:
 *     summary: Add a new agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Agent'
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Invalid input
 */
app.post('/agents', async (req, res) => {
    const { name, working_area, commission } = req.body;

    // Validation
    if (!name || !working_area || !commission) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Sanitization (optional, depending on your needs)
    const sanitizedCommission = parseFloat(commission).toFixed(2);

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'INSERT INTO agents (name, working_area, commission) VALUES (?, ?, ?)',
            [name, working_area, sanitizedCommission]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.end();
    }
});

// PATCH /agents/:id - Update an agent partially
/**
 * @swagger
 * /agents/{id}:
 *   patch:
 *     summary: Update an agent partially
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Agent'
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *       404:
 *         description: Agent not found
 *       400:
 *         description: Invalid input
 */
app.patch('/agents/:id', async (req, res) => {
    const { id } = req.params;
    const { name, working_area, commission } = req.body;

    // Validation
    if (!name && !working_area && !commission) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'UPDATE agents SET name = COALESCE(?, name), working_area = COALESCE(?, working_area), commission = COALESCE(?, commission) WHERE id = ?',
            [name, working_area, commission, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        res.status(200).json({ message: 'Agent updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.end();
    }
});

// PUT /agents/:id - Replace an agent entirely
/**
 * @swagger
 * /agents/{id}:
 *   put:
 *     summary: Replace an agent entirely
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Agent'
 *     responses:
 *       200:
 *         description: Agent replaced successfully
 *       404:
 *         description: Agent not found
 *       400:
 *         description: Invalid input
 */
app.put('/agents/:id', async (req, res) => {
    const { id } = req.params;
    const { name, working_area, commission } = req.body;

    // Validation
    if (!name || !working_area || !commission) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'UPDATE agents SET name = ?, working_area = ?, commission = ? WHERE id = ?',
            [name, working_area, commission, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        res.status(200).json({ message: 'Agent replaced successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.end();
    }
});

// DELETE /agents/:id - Delete an agent
/**
 * @swagger
 * /agents/{id}:
 *   delete:
 *     summary: Delete an agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 */
app.delete('/agents/:id', async (req, res) => {
    const { id } = req.params;

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query('DELETE FROM agents WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        res.status(200).json({ message: 'Agent deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.end();
    }
});

// GET /customers - Fetch all customers
/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Fetch all customers
 *     responses:
 *       200:
 *         description: A list of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Customer'
 */
app.get('/customers', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM customer');
        res.setHeader('Content-Type', 'application/json');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.end();
    }
});

// GET /orders - Fetch all orders
/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Fetch all orders
 *     responses:
 *       200:
 *         description: A list of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
app.get('/orders', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM orders');
        res.setHeader('Content-Type', 'application/json');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.end();
    }
});

// Swagger schema definitions
/**
 * @swagger
 * components:
 *   schemas:
 *     Agent:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: John Doe
 *         working_area:
 *           type: string
 *           example: New York
 *         commission:
 *           type: number
 *           format: float
 *           example: 0.15
 *     Customer:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Jane Doe
 *         city:
 *           type: string
 *           example: Los Angeles
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         order_date:
 *           type: string
 *           format: date
 *           example: '2023-10-01'
 *         amount:
 *           type: number
 *           format: float
 *           example: 100.50
 */

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://104.248.57.110:${port}`);
});
