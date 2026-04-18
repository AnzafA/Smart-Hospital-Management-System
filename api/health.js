module.exports = (req, res) => {
    res.status(200).json({ 
        message: 'Hospital Management System API is running',
        status: 'healthy',
        timestamp: new Date()
    });
};
