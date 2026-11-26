const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
    </div>
  );
};

export default AuthLayout;
