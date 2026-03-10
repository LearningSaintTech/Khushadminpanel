// src/admin/pages/Section.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, ZoomIn, X, ArrowLeft, Power, Eye } from "lucide-react";
import { getAllSections, toggleSectionActiveStatus } from "../../apis/Sectionapi";

const Section = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sectionType, setSectionType] = useState("ALL");
  const [selectedSection, setSelectedSection] = useState(null); // for detail modal
  const navigate = useNavigate();

  const fetchSections = async (pageNum = 1, type = null) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit };
      if (type && type !== "ALL") {
        params.type = type;
      }

      const response = await getAllSections(params);

      let items = [];
      let pagination = null;

      if (response?.data?.data?.items) {
        items = response.data.data.items;
        pagination = response.data.data.pagination;
      } else if (response?.data?.items) {
        items = response.data.items;
        pagination = response.data.pagination;
      } else if (response?.data && Array.isArray(response.data)) {
        items = response.data;
      } else if (Array.isArray(response)) {
        items = response;
      }

      setSections(Array.isArray(items) ? items : []);

      if (pagination) {
        setTotalPages(
          pagination.totalPages ||
          pagination.pages ||
          Math.ceil((pagination.total || items.length) / limit)
        );
      } else {
        setTotalPages(Math.ceil(items.length / limit) || 1);
      }
    } catch (error) {
      console.error("Failed to fetch sections:", error);
      alert(error?.response?.data?.message || "Failed to load sections");
      setSections([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [sectionType]);

  useEffect(() => {
    fetchSections(page, sectionType);
  }, [page, sectionType]);

  const handleToggleActive = async (section) => {
    const originalStatus = section.isActive;
    setSections(prev => prev.map(s => 
      s._id === section._id ? { ...s, isActive: !s.isActive } : s
    ));

    try {
      await toggleSectionActiveStatus(section._id);
    } catch (error) {
      console.error("Toggle failed:", error);
      setSections(prev => prev.map(s => 
        s._id === section._id ? { ...s, isActive: originalStatus } : s
      ));
      alert(error?.response?.data?.message || "Failed to update status");
    }
  };

  const openDetailModal = (section) => {
    setSelectedSection(section);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              {/* <button
                onClick={() => navigate("/admin/splash")}
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button> */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Sections
              </h1>
              <p className="mt-1 text-sm text-gray-500">Manage homepage sections</p>
            </div>
            <button
              onClick={() => navigate("/admin/sections/create")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-900 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={18} />
              <span>Add New Section</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6">
        {/* Filter */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setSectionType("ALL")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              sectionType === "ALL" ? "bg-black text-white" : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            All Sections
          </button>
          <button
            onClick={() => setSectionType("MANUAL")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              sectionType === "MANUAL" ? "bg-black text-white" : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setSectionType("CATEGORY")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              sectionType === "CATEGORY" ? "bg-black text-white" : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Category
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="inline-flex items-center gap-3 text-gray-500">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              <span>Loading sections...</span>
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-12 text-center">
            <p className="text-lg font-bold text-gray-900 mb-2">
              {sectionType !== "ALL" 
                ? `No ${sectionType.toLowerCase()} sections found`
                : "No sections found"}
            </p>
            <button
              onClick={() => navigate("/admin/sections/create")}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-gray-900 text-white font-semibold rounded-lg"
            >
              <Plus size={18} /> Create Section
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
              <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="w-14 px-3 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10">
                      #
                    </th>
                    <th className="min-w-[180px] px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="min-w-[100px] px-3 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="min-w-[160px] xl:min-w-[220px] 2xl:min-w-[300px] px-3 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Categories
                    </th>
                    <th className="min-w-[90px] px-3 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="hidden 2xl:table-cell min-w-[140px] px-3 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Navigate
                    </th>
                    <th className="min-w-[110px] px-3 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-32 px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider sticky right-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sections.map((section, idx) => (
                    <tr
                      key={section._id}
                      className="group hover:bg-gray-50/70 transition-colors duration-150"
                    >
                      <td className="w-14 px-3 py-3 text-sm font-semibold text-gray-700 text-center sticky left-0 bg-white z-10 group-hover:bg-gray-50/70">
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-bold text-gray-900" title={section.title}>
                          {section.title || "—"}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-3 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {section.type || "—"}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-3 py-3 text-sm text-gray-600">
                        {section.type === "CATEGORY" && (section.categories?.length || section.categoryId?.length) ? (
                          <div className="leading-relaxed">
                            {section.categories?.map(c => c.name || c).join(", ") ||
                              `${section.categoryId?.length || 0} categor${(section.categoryId?.length || 0) !== 1 ? 'ies' : 'y'}`}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          {section.products?.length || 0}
                        </span>
                      </td>
                      <td className="hidden 2xl:table-cell px-3 py-3 text-sm text-gray-600 truncate max-w-[140px]">
                        {section.navigation?.navigate || "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(section);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 ${
                            section.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          <Power size={12} />
                          {section.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="w-32 px-4 py-3 text-right sticky right-0 bg-white z-10 group-hover:bg-gray-50/70">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(section);
                            }}
                            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/sections/edit/${section._id}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition-all border border-gray-300 hover:border-gray-400"
                            title="Edit section"
                          >
                            <Edit size={14} />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View remains unchanged */}
            <div className="lg:hidden space-y-4">
              {sections.map((section) => (
                <div
                  key={section._id}
                  className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4 space-y-4"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 truncate">
                        {section.title || "—"}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {section.type || "—"}
                        </span>
                        {section.products?.length > 0 && (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                            {section.products.length} products
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(section)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        section.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      <Power size={14} />
                      {section.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <div className="text-sm text-gray-700 space-y-2">
                    {section.type === "CATEGORY" && (section.categories?.length || section.categoryId?.length) && (
                      <div>
                        <span className="text-gray-500 text-xs">Categories:</span>
                        <p className="mt-0.5">
                          {section.categories?.map(c => c.name || c).join(", ") || `${section.categoryId?.length} selected`}
                        </p>
                      </div>
                    )}
                    {section.navigation?.navigate && (
                      <div>
                        <span className="text-gray-500 text-xs">Navigate to:</span>
                        <p className="mt-0.5 truncate">{section.navigation.navigate}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openDetailModal(section)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg border border-gray-300"
                    >
                      <Eye size={16} />
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/admin/sections/edit/${section._id}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg border border-gray-300"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {sections.length > 0 && (
              <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-bold">{sections.length}</span> of{" "}
                  <span className="font-bold">{totalPages * limit}</span> sections
                </div>
                <div className="flex items-center gap-3">
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage(page - 1)}
                    className="px-5 py-2 bg-white border border-gray-300 rounded-lg font-medium disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-5 py-2 bg-gray-50 border border-gray-200 rounded-lg min-w-[120px] text-center">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(page + 1)}
                    className="px-5 py-2 bg-white border border-gray-300 rounded-lg font-medium disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      {selectedSection && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSection(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900 truncate pr-8">
                {selectedSection.title || "Section Details"}
              </h2>
              <button
                onClick={() => setSelectedSection(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Type</h3>
                  <p className="font-medium">{selectedSection.type || "—"}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Status</h3>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      selectedSection.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedSection.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {selectedSection.type === "CATEGORY" && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-500 mb-1">Categories</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedSection.categories?.map(c => c.name || c).join(", ") ||
                        (selectedSection.categoryId?.length
                          ? `${selectedSection.categoryId.length} categories selected`
                          : "—")}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Products Count</h3>
                  <p className="font-medium">{selectedSection.products?.length || 0}</p>
                </div>

                {selectedSection.navigation?.navigate && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-500 mb-1">Navigation</h3>
                    <p className="text-gray-700 break-all">{selectedSection.navigation.navigate}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setSelectedSection(null)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedSection(null);
                  navigate(`/admin/sections/edit/${selectedSection._id}`);
                }}
                className="px-5 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-900 flex items-center gap-2"
              >
                <Edit size={16} />
                Edit Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Section;