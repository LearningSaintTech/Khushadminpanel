// components/EditModal.jsx
import Modal from "../modals/commonmodal";

export default function EditModal({ isOpen, onClose, onSave, title, children }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || "Edit Item"}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm sm:text-base font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 text-sm sm:text-base font-medium transition-colors"
          >
            Save
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
