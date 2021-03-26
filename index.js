import axios from 'axios'
z
class Exception {
  /**
   * Exception constructor
   *
   * @param message
   * @param code
   */
  constructor (message, code) {
    if (code !== '') {
      return '[ ' + code + ', ' + message + ' ]'
    }
    return '[ ' + message + ' ]'
  }
}

export class Response {
  /**
   * Response constructor
   *
   * @param headers
   * @param body
   */
  constructor (headers, body) {
    this.setHeaders(headers)
    this.body = body
    this.RESPONSE_TYPE_JSON = 'json'
    this.RESPONSE_TYPE_TEXT = 'text'

    if (Array.isArray(body)) {
      this.responseType = this.RESPONSE_TYPE_JSON
    } else {
      this.responseType = this.RESPONSE_TYPE_TEXT
    }
  }

  static get RESPONSE_TYPE_JSON () {
    return this.RESPONSE_TYPE_JSON
  }

  static get RESPONSE_TYPE_TEXT () {
    return this.RESPONSE_TYPE_TEXT
  }

  setHeaders (headers) {
    if (Array.isArray(headers)) {
      this.headers = headers
      return this
    }

    throw new Exception('Bad headers', '')
  }

  /**
   * @param header
   * @returns {*}
   * @throws Exception
   */
  getHeader (header) {
    if (({}.propertyIsEnumerable.call(this.headers, header)) && this.headers[header].length > 0) {
      return this.headers[header]
    }

    throw new Exception('Header not found', '')
  }

  /**
   * @param hearders
   * @param body
   * @returns {Response}
   * @throws Exception
   */
  static parse (hearders, body) {
    return new Response(Response.parseHeaders(hearders), Response.parseBody(body))
  }

  /**
   * @returns {number}
   * @throws Exception
   */
  getHttpCode () {
    let httpHeader = this.getHeader('Status')
    httpHeader = httpHeader.split(' ')

    return parseInt(httpHeader[1], 10)
  }

  /**
   * @param headers
   * @returns {Array}
   */
  static parseHeaders (headers) {
    // We convert the raw header string into an array
    headers = headers.split('\n')
    headers = headers.map(function (header) {
      const exploded = header.split(':')

      return exploded.map(function (value) {
        return value.trim().replace('"', '')
      })
    })
    // We remove empty lines in array
    headers = headers.filter(function (value) {
      return (Array.isArray(value) ? value[0] : value) !== ''
    })
    // Lastly, we clean the array format to be a key => value array
    // The response code is special as there is no key. We handle it differently
    const statusHeader = []
    let index

    for (index = 0; index < headers.length; ++index) {
      const header = ({}.propertyIsEnumerable.call(headers, index) ? headers[index] : [])
      if (!{}.propertyIsEnumerable.call(header, 1) || header[1].length > 0) {
        break
      }
      if ({}.propertyIsEnumerable.call(header, 0) && header[0].length > 0) {
        statusHeader.push({
          Status: header[0]
        })

        headers.splice(index, 1)
      }
    }
    const processedHeaders = statusHeader

    for (index = 0; index < headers.length; ++index) {
      const header = ({}.propertyIsEnumerable.call(headers, index) ? headers[index] : [])
      if (!{}.propertyIsEnumerable.call(header, 1) || header[1].length <= 0) {
        continue
      }

      processedHeaders[header[0]] = header[1]
    }

    return processedHeaders
  }

  /**
   * @param body
   * @returns {*}
   */
  static parseBody (body) {
    if (Response.isJson(body)) {
      return JSON.parse(body)
    }

    return body
  }

  /**
   * @param string
   * @returns {boolean}
   */
  static isJson (string) {
    try {
      JSON.parse(string)
    } catch (e) {
      return false
    }
    return true
  }
}

export class AxiosClient {
  /**
   * AxiosClient constructor
   *
   * @param apiUrl
   */
  constructor (apiUrl) {
    this.baseUrl = apiUrl
  }

  /**
   * Execute an axios request
   *
   * @param method
   * @param url
   * @param options
   * @param dataInfo
   * @throws Exception
   */
  request (method, url, options, dataInfo = false) {
    let completeUrl = encodeURI(this.baseUrl + url)
    let body = ''
    var requestOptions = {
      method: method,
      responseType: 'json'
    }

    const axiosFM = axios.create()

    options.headers['Content-Type'] = (options.headers['Content-Type'] === undefined) ? 'application/json' : options.headers['Content-Type']
    options.headers.crossDomain = true
    // -- Set url
    if ({}.propertyIsEnumerable.call(options, 'queryParams')) {
      const queryParams = this.httpBuildQuery(options.queryParams)
      completeUrl += (queryParams.length > 0 ? '?' + queryParams : '')
    }
    requestOptions.url = completeUrl
    // --

    // -- Set body
    if ({}.propertyIsEnumerable.call(options, 'json') && method !== 'GET') {
      body = '{'

      for (const jsonOptionKey in options.json) {
        // check if the property/key is defined in the object itself, not in parent
        if ({}.propertyIsEnumerable.call(options.json, jsonOptionKey)) {
          const jsonOptionData = options.json[jsonOptionKey]
          body += '"' + jsonOptionKey + '":' + (Response.isJson(jsonOptionData) ? jsonOptionData : JSON.stringify(jsonOptionData)) + ','
        }
      }

      body = (body.length > 1 ? body.substring(0, (body.length - 1)) : body)
      body += '}'

      body = JSON.parse(body)

      if (body === false) {
        throw new Exception('Failed to json encode parameters', '')
      }
    }
    // --

    // -- Set headers
    if (!{}.propertyIsEnumerable.call(options, 'headers')) {
      options.headers = []
    }
    const myHeaders = {}
    for (const headerKey in options.headers) {
      // check if the property/key is defined in the object itself, not in parent
      if ({}.propertyIsEnumerable.call(options.headers, headerKey)) {
        const headerValue = options.headers[headerKey]
        const key = headerKey.replace('"', '').trim()
        myHeaders[key] = headerValue
      }
    }

    requestOptions.headers = myHeaders

    // --

    // Send
    if ({}.propertyIsEnumerable.call(options, 'fileObject') && method === 'POST') {
      var formdata = new FormData()
      formdata.append('upload', options.fileObject, options.fileObject.name)

      requestOptions.data = formdata
    } else if (typeof body !== 'undefined' && method !== 'GET') {
      requestOptions.data = JSON.stringify(body)
    }

    // Return the rights datas for each type of request
    axiosFM.interceptors.response.use(function (res) {
      // Filtering function for successfull request
      if (dataInfo) {
        return res.data.response
      }
      if (res.data.response.data !== undefined) {
        return res.data.response.data
      }
      if (res.data.response.recordId !== undefined) {
        return res.data.response.recordId
      }
      if (res.data.response.modId !== undefined) {
        return res.data.response.modId
      }
      if (res.data.response !== undefined) {
        if (res.data.response.length === 0) {
          if (res.data.messages[0].code === '0') {
            return true
          }
          if (res.data.messages[0].code === '10') {
            return false
          }
        }
        return res.data.response
      }
    }, function (error) {
      // Filtering function for failed request or empty data
      // Return empty object for data and 0 for the count of found datas
      if ((error.config.url.includes('_find')) && (error.response.data.messages[0].code === '401')) {
        return { data: {}, dataInfo: { foundCount: 0 } }
      }
      throw new Exception(error.response.data.messages[0].message, error.response.data.messages[0].code)
    })

    return axiosFM(requestOptions)
  }

  httpBuildQuery (paramsData) {
    const searchParameters = new URLSearchParams()

    Object.keys(paramsData).forEach(function (parameterName) {
      searchParameters.append(parameterName, paramsData[parameterName])
    })

    return searchParameters.toString()
  }
}

export default class DataApi {
  /**
   * DataApi constructor
   *
   * @param options
   */
  constructor (options = {}, logNow = true) {
    this.SCRIPT_PREREQUEST = 'prerequest'
    this.SCRIPT_PRESORT = 'presort'
    this.SCRIPT_POSTREQUEST = 'postrequest'
    this.LASTVERSION = 'v1'
    // Init properties
    this.initProperties()

    // Set properties if in options variable
    if ({}.propertyIsEnumerable.call(options, 'login')) {
      this.apiUsername = options.login
    }

    if ({}.propertyIsEnumerable.call(options, 'version')) {
      this.version = options.version
    }

    if ({}.propertyIsEnumerable.call(options, 'password')) {
      this.apiPassword = options.password
    }

    if ({}.propertyIsEnumerable.call(options, 'oAuthRequestId')) {
      this.oAuthRequestId = options.oAuthRequestId
    }

    if ({}.propertyIsEnumerable.call(options, 'oAuthIdentifier')) {
      this.oAuthIdentifier = options.oAuthIdentifier
    }

    if ({}.propertyIsEnumerable.call(options, 'token')) {
      this.apiToken = options.token
    }

    if ({}.propertyIsEnumerable.call(options, 'databaseName')) {
      this.apiDatabase = options.databaseName
    }

    if ({}.propertyIsEnumerable.call(options, 'apiUrl')) {
      this.ClientRequest = new AxiosClient(options.apiUrl)
    }

    // Constructor problem
    if (!this.thereIsCredentials() || this.apiToken.length === 0) {
      new Exception('Data Api needs valid credentials [username;password] or [authRequestId;authIdentifier] or [token]', '') // eslint-disable-line no-new
    }

    if (logNow) {
      // Basic default Authentication
      this.login()
    }
  }

  // -- Start auth Part --

  /**
   * Login to FileMaker API
   *
   * @returns {DataApi}
   * @throws Exception
   */
  async login () {
    // Available only if there is credentials
    if (this.thereIsCredentials()) {
      const headers = this.getHeaderAuth()

      // Send axios request
      return this.ClientRequest.request(
        'POST',
        '/' + this.version + '/databases/' + this.apiDatabase + '/sessions', {
          headers: headers,
          json: []
        }
      ).then((response) => {
        this.apiToken = response.token
        return this
      })
    }

    return new Exception('Not available without credentials', '')
  }

  /**
   * Close the connection with FileMaker Server API
   *
   * @returns {DataApi}
   * @throws Exception
   */
  logout () {
    // Send axios request
    this.ClientRequest.request(
      'DELETE',
      '/' + this.version + '/databases/' + this.apiDatabase + '/sessions/' + this.apiToken,
      []
    )

    this.apiToken = ''

    return this
  }

  /**
   * Validate Session
   *
   * @returns {boolean}
   */
  validateSession () {
    // Send axios request
    const response = this.ClientRequest.request(
      'GET',
      '/' + this.version + '/validateSession',
      {
        headers: this.getDefaultHeaders()
      }
    )
    return response
  }

  // -- End auth Part --

  // -- Start records Part --

  /**
   * Create a new record
   *
   * @param layout
   * @param data
   * @param scripts
   * @param portalData
   * @returns {*}
   * @throws Exception
   */
  createRecord (layout, data, scripts = [], portalData = {}) {
    // Prepare options
    const jsonOptions = this.encodeFieldData(data)

    if (Object.keys(portalData).length > 0) {
      jsonOptions.portalData = this.encodePortalData(portalData)
    }

    // Add scripts
    this.prepareScriptOptions(scripts, jsonOptions)

    // Send axios request
    const response = this.ClientRequest.request(
      'POST',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/records',
      {
        headers: this.getDefaultHeaders(),
        json: jsonOptions
      }
    )
    return response
  }

  /**
   * Duplicate an existing record
   *
   * @param layout
   * @param recordId
   * @param scripts
   * @returns {*}
   * @throws Exception
   */
  duplicateRecord (layout, recordId, scripts = []) {
    // Send axios request
    const response = this.ClientRequest.request(
      'POST',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/records/' + recordId, {
        headers: this.getDefaultHeaders(),
        json: this.prepareScriptOptions(scripts)
      }
    )

    return response.recordId
  }

  /**
   * Edit an existing record by ID
   *
   * @param layout
   * @param recordId
   * @param data
   * @param lastModificationId
   * @param portalData
   * @param scripts
   * @returns {*}
   * @throws Exception
   */
  editRecord (layout, recordId, data, lastModificationId = '', portalData = {}, scripts = []) {
    // Prepare options
    const jsonOptions = this.encodeFieldData(data)

    if (lastModificationId.length > 0) {
      jsonOptions.modId = lastModificationId
    }

    if (Object.keys(portalData).length > 0) {
      jsonOptions.portalData = this.encodePortalData(portalData)
    }

    // Add scripts
    this.prepareScriptOptions(scripts, jsonOptions)

    // Send axios request
    const response = this.ClientRequest.request(
      'PATCH',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/records/' + recordId, {
        headers: this.getDefaultHeaders(),
        json: jsonOptions
      }
    )

    return response.modId
  }

  /**
   * Delete record by ID
   *
   * @param layout
   * @param recordId
   * @param scripts
   * @throws Exception
   */
  deleteRecord (layout, recordId, scripts = []) {
    // Send axios request
    this.ClientRequest.request(
      'DELETE',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/records/' + recordId, {
        headers: this.getDefaultHeaders(),
        json: this.prepareScriptOptions(scripts)
      }
    )
  }

  /**
   * Get record detail by ID
   *
   * @param layout
   * @param recordId
   * @param portals
   * @param scripts
   * @param responseLayout
   * @returns {*}
   * @throws Exception
   */
  getRecord (layout, recordId, portals = [], scripts = [], responseLayout = '') {
    // Prepare options
    const jsonOptions = {}

    // optional parameters
    if (responseLayout.length > 0) {
      jsonOptions['layout.response'] = responseLayout
    }

    // Add scripts
    this.prepareScriptOptions(scripts, jsonOptions)

    // Add portals
    this.preparePortalsOptions(portals, jsonOptions)

    // Send axios request
    const response = this.ClientRequest.request(
      'GET',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/records/' + recordId, {
        headers: this.getDefaultHeaders(),
        queryParams: jsonOptions
      }
    )

    return response
  }

  /**
   * Get list of records
   *
   * @param layout
   * @param sort
   * @param offset
   * @param limit
   * @param portals
   * @param scripts
   * @param responseLayout
   * @returns {*}
   * @throws Exception
   */
  getRecords (layout, sort = '', offset = '', limit = '', portals = [], scripts = [], dataInfo = false, responseLayout = '') {
    // Search options
    const jsonOptions = this.prepareJsonOption({}, offset, limit, sort, responseLayout, true)

    // Add scripts
    this.prepareScriptOptions(scripts, jsonOptions)

    // Add portals
    this.preparePortalsOptions(portals, jsonOptions)

    // Send axios request
    return this.ClientRequest.request(
      'GET',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/records',
      {
        headers: this.getDefaultHeaders(),
        queryParams: jsonOptions
      },
      dataInfo
    )
  }

  /**
   * Find records
   *
   * @param layout
   * @param query
   * @param sort
   * @param offset
   * @param limit
   * @param portals
   * @param scripts
   * @param responseLayout
   * @returns {*}
   * @throws Exception
   */
  findRecords (layout, query, sort = '', offset = '', limit = '', portals = [], scripts = [], dataInfo = false, responseLayout = '') {
    // Prepare query
    let preparedQuery

    if (!Array.isArray(query)) {
      preparedQuery = [query]
    } else {
      preparedQuery = this.prepareQueryOptions(query)
    }

    // Prepare options
    const jsonOptions = {
      query: JSON.stringify(preparedQuery)
    }
    // Search options
    this.prepareJsonOption(jsonOptions, offset, limit, sort, responseLayout)

    // Add scripts
    this.prepareScriptOptions(scripts, jsonOptions)

    // Add portals
    this.preparePortalsOptions(portals, jsonOptions)

    // Send axios request
    const response = this.ClientRequest.request(
      'POST',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/_find',
      {
        headers: this.getDefaultHeaders(),
        json: jsonOptions
      },
      dataInfo
    )

    return response
  }

  // -- End records Part --

  // -- Start scripts Part --

  /**
   * Execute script alone
   *
   * @param layout
   * @param scriptName
   * @param scriptParam
   * @returns {*}
   * @throws Exception
   */
  executeScript (layout, scriptName, scriptParam = '') {
    // Prepare options
    const jsonOptions = {}

    // optional parameters
    if (scriptParam.length > 0) {
      jsonOptions['script.param'] = scriptParam
    }

    // Send axios request
    const response = this.ClientRequest.request(
      'GET',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/script/' + scriptName, {
        headers: this.getDefaultHeaders(),
        queryParams: jsonOptions
      }
    )

    return response
  }

  // -- End scripts Part --

  // -- Start container Part --

  /**
   * Upload files into container field with or without specific repetition
   *
   * @param layout
   * @param recordId
   * @param containerFieldName
   * @param containerFieldRepetition
   * @param file
   * @returns {boolean}
   * @throws Exception
   */
  uploadToContainer (layout, recordId, containerFieldName, containerFieldRepetition = '', file) {
    // Prepare options
    let containerFieldRepetitionFormat = ''

    if (containerFieldRepetition.length > 0) {
      containerFieldRepetitionFormat = '/' + parseInt(containerFieldRepetition)
    }

    const headers = this.getDefaultHeaders()

    headers['Content-Type'] = 'application/json'

    // Send axios request
    const response = this.ClientRequest.request(
      'POST',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + '/records/' + recordId + '/containers/' + containerFieldName + containerFieldRepetitionFormat, {
        headers: headers,
        fileObject: file
      }
    )

    return response
  }

  // -- End container Part --

  // -- Start globals Part --

  /**
   * Define one or multiple global fields
   *
   * @param layout
   * @param globalFields
   * @returns {*}
   * @throws Exception
   */
  setGlobalFields (layout, globalFields) {
    // Send axios request
    const response = this.ClientRequest.request(
      'PATCH',
      '/' + this.version + '/databases/' + this.apiDatabase + '/globals', {
        headers: this.getDefaultHeaders(),
        json: {
          globalFields: JSON.stringify(globalFields)
        }
      }
    )

    return response
  }

  // -- End globals Part --

  // -- Start metadata Part --

  /**
   * @returns {*}
   * @throws Exception
   */
  getProductInfo () {
    // Send axios request
    const response = this.ClientRequest.request(
      'GET',
      '/' + this.version + '/productInfo', {
        headers: this.getDefaultHeaders(),
        json: []
      }
    )

    return response
  }

  /**
   * @returns {*}
   * @throws Exception
   */
  getDatabaseNames () {
    // Available only if there is credentials
    if (this.thereIsCredentials()) {
      // Send axios request
      const response = this.ClientRequest.request(
        'GET',
        '/' + this.version + '/databases', {
          headers: this.getHeaderAuth(),
          json: []
        }
      )

      return response
    }

    return new Exception('Not available without credentials', '')
  }

  /**
   * @returns {*}
   * @throws Exception
   */
  getLayoutNames () {
    // Send axios request
    const response = this.ClientRequest.request(
      'GET',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts', {
        headers: this.getDefaultHeaders(),
        json: []
      }
    )

    return response
  }

  /**
   * @returns {*}
   * @throws Exception
   */
  getScriptNames () {
    // Send axios request
    const response = this.ClientRequest.request(
      'GET',
      '/' + this.version + '/databases/' + this.apiDatabase + '/scripts', {
        headers: this.getDefaultHeaders(),
        json: []
      }
    )

    return response
  }

  /**
   * @param layout
   * @param recordId
   * @returns {*}
   * @throws Exception
   */
  getLayoutMetadata (layout, recordId = '') {
    // Prepare options
    const jsonOptions = []

    let metadataFormat = '/metadata'

    if (recordId.length > 0) {
      jsonOptions.recordId = recordId
      metadataFormat = ''
    }

    // Send axios request
    const response = this.ClientRequest.request(
      'GET',
      '/' + this.version + '/databases/' + this.apiDatabase + '/layouts/' + layout + metadataFormat, {
        headers: this.getDefaultHeaders(),
        json: jsonOptions
      }
    )

    return response
  }

  // -- End metadata Part --

  // -- Class accessors --

  /**
   * Get API token returned after a successful login
   *
   * @returns {*|null}
   */
  getApiToken () {
    return this.apiToken
  }

  /**
   * Set API token returned after a successful login
   *
   * @param apiToken
   * @returns {*|null}
   */
  setApiToken (apiToken) {
    this.apiToken = apiToken
  }

  /**
   * @param version
   */
  setVersion (version) {
    this.version = version
  }

  /**
   * Set API token in request headers
   *
   * @returns {{Authorization: (*|null)}}
   */
  getDefaultHeaders () {
    return {
      Authorization: 'Bearer ' + this.apiToken
    }
  }

  /**
   * Get header authorization for basic Auth
   *
   * @returns {{Authorization: *}}
   */
  getHeaderBasicAuth () {
    return {
      Authorization: 'Basic ' + btoa(this.apiUsername + ':' + this.apiPassword)
    }
  }

  /**
   * Get header authorization for OAuth
   *
   * @returns {{"X-FM-Data-Login-Type": string, "X-FM-Data-OAuth-Request-Id": *, "X-FM-Data-OAuth-Identifier": *}}
   */
  getHeaderOAuth () {
    return {
      'X-FM-Data-Login-Type': 'oauth',
      'X-FM-Data-OAuth-Request-Id': this.oAuthRequestId,
      'X-FM-Data-OAuth-Identifier': this.oAuthIdentifier
    }
  }

  /**
   * Get Header switch to parameters
   *
   * @returns {Array}
   */
  getHeaderAuth () {
    let headers = []
    if (this.apiUsername.length > 0) {
      headers = this.getHeaderBasicAuth()
    }

    if (this.oAuthRequestId.length > 0) {
      headers = this.getHeaderOAuth()
    }

    return headers
  }

  // -- Options worker functions --

  /**
   * Prepare options fields for query
   *
   * @param query
   * @returns {Array}
   */
  prepareQueryOptions (query) {
    const item = []

    if (Array.isArray(query)) {
      for (let index = 0; index < query.length; ++index) {
        const queryItem = query[index]

        if (!{}.propertyIsEnumerable.call(queryItem, 'fields')) {
          break
        }

        if (!Array.isArray(queryItem.fields)) {
          if ({}.propertyIsEnumerable.call(queryItem.fields, 'fieldname') && {}.propertyIsEnumerable.call(queryItem.fields, 'fieldvalue')) {
            const obj = {}
            obj[queryItem.fields.fieldname.replace('"', '').trim()] = queryItem.fields.fieldvalue

            item.push(obj)
          }
        } else {
          const objRequest = {}
          const objOmit = {}
          for (const index in queryItem.fields) {
            const fieldData = queryItem.fields[index]

            if ({}.propertyIsEnumerable.call(fieldData, 'fieldname') && {}.propertyIsEnumerable.call(fieldData, 'fieldvalue')) {
              if ({}.propertyIsEnumerable.call(fieldData, 'omit') && fieldData.omit) {
                objOmit[fieldData.fieldname.replace('"', '').trim()] = fieldData.fieldvalue
                objOmit.omit = 'true'
              } else {
                objRequest[fieldData.fieldname.replace('"', '').trim()] = fieldData.fieldvalue
              }
            }
          }
          if (Object.entries(objRequest).length > 0) {
            item.push(objRequest)
          }
          if (Object.entries(objOmit).length > 0) {
            item.push(objOmit)
          }
        }
      }
    }

    return item
  }

  /**
   * Prepare options for script
   *
   * @param scripts
   * @param jsonOptions
   * @returns {Array}
   */
  prepareScriptOptions (scripts, jsonOptions = {}) {
    if (Array.isArray(scripts)) {
      let index

      const listType = [this.SCRIPT_POSTREQUEST, this.SCRIPT_PREREQUEST, this.SCRIPT_PRESORT]

      for (index = 0; index < scripts.length; ++index) {
        const script = scripts[index]

        if (listType.indexOf(script.type) < 0) {
          continue
        }

        const scriptSuffix = !(script.type === this.SCRIPT_POSTREQUEST) ? '.' + script.type : ''

        jsonOptions['script' + scriptSuffix] = script.name
        jsonOptions['script' + scriptSuffix + '.param'] = script.param
      }
    }

    return jsonOptions
  }

  /**
   * Prepare options for portals
   *
   * @param portals
   * @param jsonOptions
   * @returns {Array}
   */
  preparePortalsOptions (portals, jsonOptions = {}) {
    if (portals.length <= 0) {
      return []
    }

    const portalList = []
    let index

    for (index = 0; index < portals.length; ++index) {
      const portal = portals[index]

      portalList.push(portal.name)

      if ({}.propertyIsEnumerable.call(portal, 'offset')) {
        const optionName = '_offset.' + portal.name

        const obj = {}
        obj[optionName.replace('"', '').trim()] = parseInt(portal.offset)

        jsonOptions[optionName] = portal.offset
      }

      if ({}.propertyIsEnumerable.call(portal, 'limit')) {
        const optionName = '_limit.' + portal.name

        const obj = {}
        obj[optionName.replace('"', '').trim()] = parseInt(portal.limit)

        jsonOptions[optionName] = portal.limit
      }
    }

    jsonOptions.portal = JSON.stringify(portalList)

    return jsonOptions
  }

  /**
   * @param data
   * @returns {{fieldData: string}}
   */
  encodeFieldData (data) {
    return {
      fieldData: JSON.stringify(data)
    }
  }

  /**
   * @param portal
   * @returns {string}
   */
  encodePortalData (portal) {
    return JSON.stringify(portal)
  }

  /**
   * Prepare recurrent options for requests
   *
   * @param jsonOptions
   * @param offset
   * @param limit
   * @param sort
   * @param responseLayout
   * @param withUnderscore
   * @returns {Array}
   */
  prepareJsonOption (jsonOptions = {}, offset = '', limit = '', sort = '', responseLayout = '', withUnderscore = false) {
    const additionalCharacter = (withUnderscore ? '_' : '')

    if (sort.length > 0) {
      jsonOptions[additionalCharacter + 'sort'] = (Array.isArray(sort) ? JSON.stringify(sort) : sort)
    }

    if (limit.length > 0) {
      jsonOptions[additionalCharacter + 'limit'] = parseInt(limit)
    }

    if (offset.length > 0 && parseInt(offset) > 0) {
      jsonOptions[additionalCharacter + 'offset'] = parseInt(offset)
    }

    if (responseLayout.length > 0) {
      jsonOptions['layout.response'] = responseLayout
    }

    return jsonOptions
  }

  /**
   * Check if there is credentials set
   *
   * @returns {boolean}
   */
  thereIsCredentials () {
    return ((this.apiUsername.length > 0 && this.apiPassword.length > 0) || (this.oAuthRequestId.length > 0 && this.oAuthIdentifier.length > 0))
  }

  /**
   * Just init class properties
   */
  initProperties () {
    this.apiUsername = ''
    this.apiPassword = ''
    this.oAuthRequestId = ''
    this.oAuthIdentifier = ''
    this.apiToken = ''
    this.apiDatabase = ''
    this.ClientRequest = ''
    this.version = this.LASTVERSION
  }
}
