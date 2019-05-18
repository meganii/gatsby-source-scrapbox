const axios = require('axios')
const crypto = require('crypto')
const Promise = require('bluebird')

const SKIP_COUNT = 100
const LIMIT_COUNT = 100

exports.sourceNodes = async (
  { boundActionCreators: { createNode }, createNodeId, createContentDigest },
  { plugins, ...options }
) => {
  const client = axios.create({
    baseURL: 'https://scrapbox.io/api/',
    headers: {
      Cookie: `connect.sid=${options.sid};`
    }
  })
  
  const fetchScrapboxPages = async (skip) => {
    const {data} = await client.request({
      method: 'get',
      url: `/pages/${options.project_name}`,
      params: {
        skip: skip,
        limit: LIMIT_COUNT
      }
    })
    return data
  }

  const fetchScrapboxPage = async (page) => {
    const {data} = await client.request({
      method: 'get',
      url: `/pages/${options.project_name}/${encodeURIComponent(page.title)}/`,
    })
    return data
  }

  let initialPages = await fetchScrapboxPages(0);
  for (let i = 0; i < initialPages.count; i = i + SKIP_COUNT) {
    console.log(` count: ${i}`);
    let data = await fetchScrapboxPages(i);

    try {
      const results = await Promise.map(data.pages, async (page) => {
        return await fetchScrapboxPage(page)
      }, { concurrency: 5 })

      results.forEach(page => {
        createNode({
          ...page,
          id: createNodeId(`scrapbox-page-${page.id}`),
          parent: null,
          children: [],
          internal: {
            type: 'ScrapboxPage',
            content: JSON.stringify(page),
            contentDigest: crypto
              .createHash('md5')
              .update(JSON.stringify(page))
              .digest('hex')
          }
        })
      })
    } catch (error) {
      console.error(error)
    }
  }
}