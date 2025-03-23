import Image from 'next/image';
import AuthForm from '../../components/shared/AuthForm';

export default function Home() {
  return (
    <div className="grid min-h-screen overflow-hidden lg:grid-cols-2">
      <div className="relative hidden lg:block bg-primary rounded-3xl m-4">
        <div className="flex flex-col justify-center items-start mt-16 mx-[48px]">
          <h2 className="text-4xl font-semibold text-white">
            Streamline Your Notes
          </h2>
          <p className="mt-2 font-normal text-xl text-white">
            Access all your collaborative notes in <br></br> one place, anytime,
            anywhere.
          </p>
          <div className="mt-10 w-full overflow-hidden flex justify-center">
            <Image
              alt="Catatan Cerdas"
              src="/images/landing.svg"
              width={600}
              height={200}
              priority
              sizes="(max-width: 1280px) 100vw, 50vw"
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: '600px',
              }}
              className="object-cover rounded-lg"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="relative h-16 w-16 mx-auto">
            <Image
              alt="Logo"
              src="/images/logo.png"
              fill
              sizes="64px"
              style={{
                objectFit: 'contain',
              }}
              className="w-auto"
            />
          </div>
          <h2 className="mt-4 text-center text-4xl font-semibold tracking-tight text-primary">
            Catatan Cerdas
          </h2>
          <p className="mt-4 text-center text-lg font-normal tracking-normal text-gray-500">
            Welcome back! Collaborate smarter and <br></br> stay connected with
            your team
          </p>
        </div>
        <AuthForm />
        <div className="mt-8">
          <p className="text-center text-md font-normal tracking-normal text-gray-500">
            2024 Catatan Cerdas, All right reserved
          </p>
        </div>
      </div>
    </div>
  );
}
