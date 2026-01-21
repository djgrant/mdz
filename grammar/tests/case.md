CASE $status
WHEN "draft" OR "pending"
    RETURN "needs review"
WHEN "published" THEN
  SPAWN ~/agent/report WITH note that post is published
  RETURN "announce"
ELSE
  RETURN "ignore"
END
