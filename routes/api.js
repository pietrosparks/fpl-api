
module.exports = (express)=>{
    
    const api = express.Router();
    require('./auth')(api);
    require('./paystack')(api);

    return api;
}