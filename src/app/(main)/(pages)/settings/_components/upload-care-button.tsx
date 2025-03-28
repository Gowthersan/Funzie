"use client";

import "@uploadcare/react-uploader/core.css";
import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import { useRouter } from "next/navigation";

type Props = {
  onUpload: (e: string) => any;
};

const UploadCareButton = ({ onUpload }: Props) => {
  const router = useRouter();

  const handleChange = async (file: any) => {
    console.log("File uploaded:", file);

    const cdnUrl = file?.cdnUrl;
    if (!cdnUrl) {
      console.error("Erreur: cdnUrl introuvable. Fichier reçu:", file);
      return;
    }

    if (onUpload) {
      const uploadedFile = await onUpload(cdnUrl);
      if (uploadedFile) {
        router.refresh();
      }
    }
  };

  return (
    <div>
      <FileUploaderRegular
        pubkey="6c4d2068ad1cd2228485"
        sourceList="local, camera, facebook, gdrive"
        cameraModes="photo, video"
        classNameUploader="uc-dark uc-purple"
        onFileUploadSuccess={handleChange}
      />
    </div>
  );
};

export default UploadCareButton;
