const multer = require('multer')


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/assignments/');
    },
    filename: function (req, file, cb) {
        const { taskid } = req.params;
        const { email } = req.body;
        const fileType = file.mimetype.split('/')[1];
        const uniqueFilename = taskid + '-' + email + '-' + 'type.' + fileType;
        cb(null, uniqueFilename);
    }
})

const upload = multer({ storage: storage });

module.exports = upload;