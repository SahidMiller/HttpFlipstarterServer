SELECT *
FROM commitments
LEFT JOIN contributionCommitments USING (commitment_id)
LEFT JOIN contributions USING (contribution_id)
LEFT JOIN fullfillments USING (campaign_id)
LEFT JOIN revocations USING (commitment_id)
WHERE address = :address