// components/DeleteModal.jsx
import Modal from "../modals/commonmodal";

export default function DeleteModal({ isOpen, onClose, onConfirm, itemName = "item" }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Delete"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </>
      }
    >
      <p>Are you sure you want to delete this {itemName}?</p>
    </Modal>
  );
}
