import bcrypt from 'bcryptjs';
const run = async () => {
    const hash = await bcrypt.hash('password123', 10);
    console.log(hash);
};
run();
