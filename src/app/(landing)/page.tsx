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
          <div className="mt-10 overflow-hidden">
            <Image
              alt="Catatan Cerdas"
              src="/images/heroimage.png"
              width={600}
              height={200}
              className="object-cover rounded-lg"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Image
            alt="Logo"
            height="64"
            width="64"
            className="mx-auto w-auto"
            src="/images/logo.png"
          />
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
