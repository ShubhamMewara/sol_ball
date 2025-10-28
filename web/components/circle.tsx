import React from "react";

const Circle = ({ url }: { url?: string }) => {
  return (
    <div className="w-24 h-24 rounded-full ">
      <img
        className=""
        src={
          url ??
          "https://rotaidwsuspvtajitelz.supabase.co/storage/v1/object/public/solball/logo.png"
        }
        alt=""
      />
    </div>
  );
};

export default Circle;
