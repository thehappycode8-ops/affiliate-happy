import LoginForm from '@/components/LoginForm';
import Logo from '@/components/Logo';

export const metadata = { title: 'เข้าสู่ระบบหลังบ้าน — Happy' };

export default function LoginPage() {
  return (
    <main className="page">
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-brand">
            <Logo className="login-logo" />
          </div>
          <LoginForm />
          <p className="footer">
            <a href="/">← กลับหน้าส่งคลิป</a>
          </p>
        </div>
      </div>
    </main>
  );
}
