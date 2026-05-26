// src/pages/admin/MakeFeedback.jsx

import React, {
  useEffect,
  useState,
} from "react";

import {
  getAllFeedbacks,
} from "../../apis/feedbackApi";

import {
  RefreshCw,
  Loader2,
  MessageSquare,
  Phone,
  User,
  CalendarDays,
} from "lucide-react";

import toast from "react-hot-toast";

export default function MakeFeedback() {
  const [feedbacks, setFeedbacks] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      total: 0,
      totalPages: 1,
      limit: 20,
    });

  // ================= FETCH FEEDBACKS =================

  const fetchFeedbacks =
    async () => {
      try {
        setLoading(true);

        const response =
          await getAllFeedbacks(
            page,
            20
          );

        console.log(
          "GET ALL FEEDBACKS RESPONSE:",
          response
        );

        // ✅ Correct API structure
        const data =
          response?.data;

        setFeedbacks(
          data?.suggestions || []
        );

        setPagination(
          data?.pagination || {
            total: 0,
            totalPages: 1,
            limit: 20,
          }
        );
      } catch (error) {
        console.error(
          "FETCH FEEDBACK ERROR:",
          error
        );

        toast.error(
          error?.response?.data
            ?.message ||
            "Failed to fetch feedbacks"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchFeedbacks();
  }, [page]);

  // ================= FORMAT DATE =================

  const formatDate = (
    date
  ) => {
    return new Date(
      date
    ).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ================= HEADER ================= */}

        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Feedbacks
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              View all user
              suggestions and
              feedback submissions.
            </p>
          </div>

          <button
            onClick={
              fetchFeedbacks
            }
            className="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            <RefreshCw size={18} />

            Refresh
          </button>
        </div>

        {/* ================= STATS ================= */}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Feedbacks
            </p>

            <h2 className="mt-2 text-3xl font-bold text-black">
              {pagination?.total ||
                0}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Current Page
            </p>

            <h2 className="mt-2 text-3xl font-bold text-black">
              {page}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Pages
            </p>

            <h2 className="mt-2 text-3xl font-bold text-black">
              {pagination?.totalPages ||
                1}
            </h2>
          </div>
        </div>

        {/* ================= FEEDBACK LIST ================= */}

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Feedback List
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Total Records:{" "}
                {
                  feedbacks?.length
                }
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2
                className="animate-spin text-black"
                size={45}
              />
            </div>
          ) : feedbacks?.length ===
            0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50">
              <MessageSquare
                size={55}
                className="text-gray-400"
              />

              <h3 className="mt-4 text-xl font-semibold text-gray-700">
                No Feedback Found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                User suggestions
                will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {feedbacks?.map(
                (item) => (
                  <div
                    key={
                      item?._id
                    }
                    className="group rounded-3xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* USER INFO */}

                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
                        <User
                          size={
                            24
                          }
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {
                            item?.userName
                          }
                        </h3>

                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                          <Phone
                            size={
                              14
                            }
                          />

                          {
                            item?.phone
                          }
                        </div>
                      </div>
                    </div>

                    {/* FEEDBACK */}

                    <div className="mt-5 rounded-2xl bg-gray-50 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <MessageSquare
                          size={18}
                          className="text-black"
                        />

                        <p className="text-sm font-semibold text-gray-700">
                          Feedback
                        </p>
                      </div>

                      <p className="leading-7 text-gray-700">
                        {
                          item?.text
                        }
                      </p>
                    </div>

                    {/* DATE */}

                    <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
                      <CalendarDays
                        size={16}
                      />

                      {formatDate(
                        item?.createdAt
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* ================= PAGINATION ================= */}

          {!loading &&
            feedbacks?.length >
              0 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  disabled={
                    page === 1
                  }
                  onClick={() =>
                    setPage(
                      (
                        prev
                      ) =>
                        prev - 1
                    )
                  }
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">
                  Page {page} of{" "}
                  {
                    pagination?.totalPages
                  }
                </div>

                <button
                  disabled={
                    page ===
                    pagination?.totalPages
                  }
                  onClick={() =>
                    setPage(
                      (
                        prev
                      ) =>
                        prev + 1
                    )
                  }
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}